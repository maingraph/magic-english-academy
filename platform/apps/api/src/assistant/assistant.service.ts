import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ServiceUnavailableException
} from "@nestjs/common";
import { createDecipheriv, createHash } from "node:crypto";
import OpenAI from "openai";
import type { ApiSessionUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";

const assistantActions = {
  explain: {
    label: "Объяснить выбранную фразу",
    instruction:
      "Объясни выбранную английскую фразу простым русским языком. Укажи значение, грамматическую роль и один короткий пример."
  },
  examples: {
    label: "Показать больше примеров",
    instruction:
      "Дай четыре коротких английских примера с выбранной конструкцией и добавь краткий перевод на русский."
  },
  quiz: {
    label: "Создать мини-тест",
    instruction:
      "Создай один вопрос по контексту урока с тремя вариантами ответа. После пустой строки укажи правильный ответ."
  },
  check: {
    label: "Проверить мой ответ",
    instruction:
      "Проверь грамматику и лексику текста ученика. Покажи исправленный вариант и не более трёх коротких пояснений."
  }
} as const;

type AssistantAction = keyof typeof assistantActions;
type AssistantProvider = "openai" | "openrouter";

export type AssistantActionPayload = {
  action?: unknown;
  text?: unknown;
  lessonSlug?: unknown;
};

export type AssistantTestPayload = {
  provider?: unknown;
  model?: unknown;
  apiKey?: unknown;
};

@Injectable()
export class AssistantService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getStatus(user: ApiSessionUser, lessonSlug?: string) {
    if (!lessonSlug) {
      throw new BadRequestException("Ассистент доступен только внутри урока");
    }
    const config = await this.getConfig();
    const used = await this.dailyUsage(user.id);

    return {
      configured: Boolean(config.apiKey),
      model: config.model,
      dailyQuota: config.dailyQuota,
      used,
      remaining: Math.max(config.dailyQuota - used, 0),
      context: "lesson",
      actions: Object.entries(assistantActions).map(([id, action]) => ({
        id,
        label: action.label
      }))
    };
  }

  async runAction(user: ApiSessionUser, payload: AssistantActionPayload) {
    const action = this.parseAction(payload.action);
    const text = this.parseText(payload.text);
    const lessonSlug = this.parseLessonSlug(payload.lessonSlug);
    if (!lessonSlug) {
      throw new BadRequestException("Ассистент доступен только внутри урока");
    }
    const config = await this.getConfig();

    if (!config.apiKey) {
      throw new ServiceUnavailableException(
        "Администратор ещё не настроил API-ключ ассистента"
      );
    }

    const used = await this.dailyUsage(user.id);

    if (used >= config.dailyQuota) {
      throw new HttpException("Дневной лимит обращений к ассистенту исчерпан", HttpStatus.TOO_MANY_REQUESTS);
    }

    if (text && this.looksToxic(text)) {
      await this.prisma.abuseSignal.create({
        data: {
          userId: user.id,
          type: "TOXIC_ASSISTANT_INPUT",
          severity: "MEDIUM",
          details: {
            action,
            excerpt: text.slice(0, 180)
          }
        }
      });
    }

    const lesson = lessonSlug
      ? await this.prisma.lesson.findUnique({
          where: { slug: lessonSlug },
          include: {
            blocks: {
              orderBy: { orderIndex: "asc" }
            }
          }
        })
      : null;
    const session =
      (await this.prisma.assistantSession.findFirst({
        where: { userId: user.id, lessonId: lesson?.id ?? null },
        orderBy: { createdAt: "desc" }
      })) ??
      (await this.prisma.assistantSession.create({
        data: {
          userId: user.id,
          lessonId: lesson?.id ?? null
        }
      }));
    const lessonContext = lesson
      ? JSON.stringify({
          title: lesson.title,
          summary: lesson.summary,
          blocks: lesson.blocks.map((block) => block.content)
        }).slice(0, 5000)
      : "Контекст урока отсутствует.";
    const userInput = [
      `Действие: ${assistantActions[action].label}`,
      `Выделение или ответ ученика: ${text || "Используй только контекст урока."}`,
      `Контекст урока: ${lessonContext}`
    ].join("\n\n");

    await this.prisma.assistantMessage.create({
      data: {
        sessionId: session.id,
        role: "user",
        content: userInput
      }
    });

    const client = this.createClient(config.provider, config.apiKey);
    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: "system",
          content: [
            "Ты учебный ассистент курса Magic English.",
            "Всегда отвечай по-русски, кроме английских примеров.",
            "Помогай изучать английский, но не выполняй оцениваемую домашнюю работу вместо ученика.",
            "Ответ должен быть короче 220 слов.",
            "Используй контекст урока, когда он передан.",
            assistantActions[action].instruction
          ].join(" ")
        },
        { role: "user", content: userInput }
      ],
      max_tokens: 450
    });
    const output = response.choices[0]?.message.content?.trim() ?? "";

    if (!output) {
      throw new ServiceUnavailableException("Провайдер вернул пустой ответ");
    }

    await this.prisma.assistantMessage.create({
      data: {
        sessionId: session.id,
        role: "assistant",
        content: output,
        tokenCount: response.usage?.total_tokens ?? 0
      }
    });
    await this.prisma.activityEvent.create({
      data: {
        userId: user.id,
        type: "ASSISTANT_ACTION_USED",
        metadata: {
          action,
          lessonSlug: lessonSlug ?? null,
          tokens: response.usage?.total_tokens ?? 0
        }
      }
    });

    return {
      action,
      output,
      usage: {
        used: used + 1,
        remaining: Math.max(config.dailyQuota - used - 1, 0)
      }
    };
  }

  async getHistory(user: ApiSessionUser, lessonSlug?: string) {
    if (!lessonSlug) {
      throw new BadRequestException("Укажите урок");
    }
    const lesson = await this.prisma.lesson.findUnique({
      where: { slug: lessonSlug },
      select: { id: true }
    });

    if (!lesson) throw new BadRequestException("Урок не найден");
    const session = await this.prisma.assistantSession.findFirst({
      where: { userId: user.id, lessonId: lesson.id },
      orderBy: { createdAt: "desc" },
      include: {
        messages: {
          where: { role: "assistant" },
          orderBy: { createdAt: "asc" },
          take: 30,
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true
          }
        }
      }
    });

    return {
      messages: session?.messages ?? []
    };
  }

  async testConnection(payload: AssistantTestPayload) {
    const saved = await this.getConfig();
    const provider = this.parseProvider(payload.provider ?? saved.provider);
    const model = this.parseModel(payload.model ?? saved.model);
    const suppliedKey =
      payload.apiKey === undefined || payload.apiKey === ""
        ? null
        : this.parseApiKey(payload.apiKey);
    const apiKey = suppliedKey ?? saved.apiKey;

    if (!apiKey) {
      throw new ServiceUnavailableException("Сначала добавьте API-ключ");
    }

    const startedAt = Date.now();
    let response;

    try {
      response = await this.createClient(provider, apiKey).chat.completions.create({
        model,
        messages: [
          {
            role: "user",
            content: "Ответь одним словом по-русски: работает"
          }
        ],
        max_tokens: 16,
        temperature: 0
      });
    } catch (error) {
      const status =
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        typeof error.status === "number"
          ? error.status
          : 503;

      throw new HttpException(
        "Провайдер отклонил запрос. Проверьте ключ, модель и баланс.",
        status >= 400 && status < 600 ? status : HttpStatus.SERVICE_UNAVAILABLE
      );
    }
    const message = response.choices[0]?.message.content?.trim();

    if (!message) {
      throw new ServiceUnavailableException("Провайдер вернул пустой ответ");
    }

    return {
      ok: true,
      provider,
      model,
      message,
      latencyMs: Date.now() - startedAt
    };
  }

  private async getConfig() {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: "assistant" }
    });
    const value =
      setting?.valueJson && typeof setting.valueJson === "object" && !Array.isArray(setting.valueJson)
        ? (setting.valueJson as Record<string, unknown>)
        : {};

    const provider = this.parseProvider(
      typeof value.provider === "string"
        ? value.provider
        : process.env.OPENROUTER_API_KEY
          ? "openrouter"
          : "openai"
    );

    return {
      provider,
      apiKey: setting?.valueEncrypted
        ? this.decrypt(setting.valueEncrypted)
        : provider === "openrouter"
          ? process.env.OPENROUTER_API_KEY ?? null
          : process.env.OPENAI_API_KEY ?? null,
      model:
        typeof value.model === "string"
          ? value.model
          : provider === "openrouter"
            ? "openai/gpt-4.1-mini"
            : "gpt-4.1-mini",
      dailyQuota:
        typeof value.dailyQuota === "number" && Number.isInteger(value.dailyQuota)
          ? value.dailyQuota
          : 20
    };
  }

  private async dailyUsage(userId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    return this.prisma.assistantMessage.count({
      where: {
        role: "user",
        createdAt: { gte: start },
        session: { userId }
      }
    });
  }

  private parseAction(value: unknown): AssistantAction {
    if (typeof value !== "string" || !(value in assistantActions)) {
      throw new BadRequestException("Неизвестное действие ассистента");
    }

    return value as AssistantAction;
  }

  private parseText(value: unknown) {
    if (value === undefined || value === null || value === "") {
      return "";
    }

    if (typeof value !== "string") {
      throw new BadRequestException("Текст должен быть строкой");
    }

    const text = value.trim();

    if (text.length > 1600) {
      throw new BadRequestException("Текст должен содержать не более 1600 символов");
    }

    return text;
  }

  private parseLessonSlug(value: unknown) {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    if (typeof value !== "string" || value.length > 180) {
      throw new BadRequestException("Некорректный адрес урока");
    }

    return value;
  }

  private looksToxic(text: string) {
    const normalized = text.toLowerCase();
    const patterns = ["fuck", "сука", "бляд", "идиот", "админ"];

    return patterns.filter((pattern) => normalized.includes(pattern)).length >= 2;
  }

  private createClient(provider: AssistantProvider, apiKey: string) {
    return new OpenAI({
      apiKey,
      ...(provider === "openrouter"
        ? {
            baseURL: "https://openrouter.ai/api/v1",
            defaultHeaders: {
              "HTTP-Referer": process.env.WEB_ORIGIN ?? "http://localhost:3000",
              "X-OpenRouter-Title": "Magic English"
            }
          }
        : {})
    });
  }

  private parseProvider(value: unknown): AssistantProvider {
    if (value !== "openai" && value !== "openrouter") {
      throw new BadRequestException("Поддерживаются провайдеры OpenRouter и OpenAI");
    }

    return value;
  }

  private parseModel(value: unknown) {
    if (typeof value !== "string" || !value.trim() || value.length > 100) {
      throw new BadRequestException("Укажите корректное название модели");
    }

    return value.trim();
  }

  private parseApiKey(value: unknown) {
    if (typeof value !== "string" || value.trim().length < 20 || value.length > 500) {
      throw new BadRequestException("Укажите корректный API-ключ");
    }

    return value.trim();
  }

  private decrypt(value: string) {
    const [ivValue, tagValue, encryptedValue] = value.split(".");

    if (!ivValue || !tagValue || !encryptedValue) {
      throw new Error("Сохранённый ключ ассистента повреждён");
    }

    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.settingsKey(),
      Buffer.from(ivValue, "base64url")
    );
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));

    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final()
    ]).toString("utf8");
  }

  private settingsKey() {
    const secret = process.env.SETTINGS_ENCRYPTION_KEY;

    if (!secret && process.env.NODE_ENV === "production") {
      throw new Error("SETTINGS_ENCRYPTION_KEY is required in production");
    }

    return createHash("sha256")
      .update(secret ?? "local-settings-key-change-before-production")
      .digest();
  }
}
