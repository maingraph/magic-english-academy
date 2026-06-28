import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { ArticleStatus, LessonBlockType, Prisma } from "@prisma/client";
import type { ApiSessionUser } from "../auth/auth.types";
import { hashPassword } from "../auth/password";
import { CoursesService } from "../courses/courses.service";
import { PrismaService } from "../prisma/prisma.service";

const lessonBlockTypes = Object.values(LessonBlockType);

export type AdminUpdateLessonPayload = {
  title?: unknown;
  summary?: unknown;
  blocks?: unknown;
};

export type AdminModulePayload = {
  levelId?: unknown;
  title?: unknown;
  description?: unknown;
};

export type AdminCreateLessonPayload = {
  moduleId?: unknown;
  title?: unknown;
  summary?: unknown;
};

export type AdminMoveLessonPayload = {
  moduleId?: unknown;
  orderIndex?: unknown;
};

export type AdminCreateUserPayload = {
  email?: unknown;
  displayName?: unknown;
};

export type AdminCreateDictionaryTermPayload = {
  term?: unknown;
  translation?: unknown;
  definition?: unknown;
  examples?: unknown;
};

export type AdminArticlePayload = {
  title?: unknown;
  slug?: unknown;
  excerpt?: unknown;
  content?: unknown;
  status?: unknown;
};

export type AdminAssistantSettingsPayload = {
  provider?: unknown;
  model?: unknown;
  dailyQuota?: unknown;
  apiKey?: unknown;
  clearApiKey?: unknown;
};

@Injectable()
export class AdminService {
  constructor(
    @Inject(CoursesService) private readonly coursesService: CoursesService,
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  async getOverview() {
    const courseInventory = await this.coursesService.getLevels();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [
      lessonBlocks,
      userCount,
      dictionaryCount,
      activeUsers,
      taskAttempts,
      correctAttempts,
      checkpointAttempts,
      openSignals,
      sales
    ] = await Promise.all([
      this.prisma.lessonBlock.findMany({
        select: {
          lessonId: true,
          content: true
        }
      }),
      this.prisma.user.count({
        where: { status: "ACTIVE" }
      }),
      this.prisma.dictionaryTerm.count(),
      this.prisma.user.count({
        where: {
          activityEvents: {
            some: { createdAt: { gte: since } }
          }
        }
      }),
      this.prisma.taskAttempt.count({ where: { createdAt: { gte: since } } }),
      this.prisma.taskAttempt.count({
        where: { createdAt: { gte: since }, isCorrect: true }
      }),
      this.prisma.taskAttempt.count({
        where: { task: { isCheckpoint: true }, createdAt: { gte: since } }
      }),
      this.prisma.abuseSignal.count({ where: { status: "OPEN" } }),
      this.prisma.metricSnapshot.aggregate({
        where: { type: "SALE", date: { gte: since } },
        _sum: { value: true }
      })
    ]);
    const placeholderLessonIds = new Set(
      lessonBlocks
        .filter((block) => {
          const content = block.content;

          return (
            typeof content === "object" &&
            content !== null &&
            !Array.isArray(content) &&
            "kind" in content &&
            content.kind === "migration-note"
          );
        })
        .map((block) => block.lessonId)
    );
    const nativeLessonCount = Math.max(
      courseInventory.totalLessons - placeholderLessonIds.size,
      0
    );
    const nativeMigrationPercent =
      courseInventory.totalLessons > 0
        ? Math.round((nativeLessonCount / courseInventory.totalLessons) * 100)
        : 0;

    return {
      metrics: [
        {
          label: "Всего уроков",
          value: String(courseInventory.totalLessons),
          tone: "neutral"
        },
        {
          label: "Нативные уроки",
          value: String(nativeLessonCount),
          tone: nativeLessonCount > 0 ? "good" : "warning"
        },
        {
          label: "Активные аккаунты",
          value: String(userCount),
          tone: "good"
        },
        {
          label: "Термины словаря",
          value: String(dictionaryCount),
          tone: "good"
        },
        {
          label: "Активны за 7 дней",
          value: String(activeUsers),
          tone: activeUsers > 0 ? "good" : "neutral"
        },
        {
          label: "Точность заданий",
          value: taskAttempts === 0 ? "—" : `${Math.round((correctAttempts / taskAttempts) * 100)}%`,
          tone: taskAttempts === 0 || correctAttempts / taskAttempts >= 0.7 ? "good" : "warning"
        },
        {
          label: "Продажи за 7 дней",
          value: `${Number(sales._sum.value ?? 0).toFixed(0)} €`,
          tone: "neutral"
        }
      ],
      nativeMigrationPercent,
      riskSignals: [
        {
          label: "Подозрительные входы",
          count: openSignals,
          tone: openSignals > 0 ? "warning" : "neutral"
        },
        {
          label: "Проверочные задания за 7 дней",
          count: checkpointAttempts,
          tone: checkpointAttempts > 0 ? "good" : "neutral"
        }
      ]
    };
  }

  async getUsers(query?: string) {
    const search = typeof query === "string" ? query.trim() : "";
    const users = await this.prisma.user.findMany({
      where: search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" } },
              { profile: { displayName: { contains: search, mode: "insensitive" } } }
            ]
          }
        : undefined,
      include: {
        profile: true,
        lessonProgress: true,
        taskAttempts: true,
        activityEvents: {
          orderBy: { createdAt: "desc" },
          take: 1
        },
        abuseSignals: {
          where: { status: "OPEN" }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 200
    });

    return {
      total: users.length,
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        displayName: user.profile?.displayName ?? user.email,
        avatarUrl: user.profile?.avatarUrl ?? null,
        role: user.role.toLowerCase(),
        status: user.status.toLowerCase(),
        completedLessons: user.lessonProgress.filter(
          (progress) => progress.status === "COMPLETED"
        ).length,
        points:
          user.taskAttempts.reduce((sum, attempt) => sum + attempt.pointsEarned, 0),
        checkpointCount: user.taskAttempts.filter((attempt) => attempt.isCorrect).length,
        lastActiveAt: user.activityEvents[0]?.createdAt ?? null,
        openSignals: user.abuseSignals.length
      }))
    };
  }

  async createUser(payload: AdminCreateUserPayload) {
    const email = this.parseEmail(payload.email);
    const displayName =
      this.parseOptionalString(payload.displayName, "displayName", 120) ??
      email.split("@")[0];
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });

    if (existingUser) {
      throw new ConflictException("Пользователь с такой электронной почтой уже существует");
    }

    const temporaryPassword = this.generateTemporaryPassword();
    const firstLevel = await this.prisma.courseLevel.findFirst({
      orderBy: { orderIndex: "asc" },
      select: { id: true }
    });
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(temporaryPassword),
        role: "STUDENT",
        status: "ACTIVE",
        profile: {
          create: {
            displayName
          }
        },
        ...(firstLevel
          ? {
              enrollments: {
                create: {
                  levelId: firstLevel.id
                }
              }
            }
          : {})
      },
      include: { profile: true }
    });

    await this.prisma.activityEvent.create({
      data: {
        userId: user.id,
        type: "ACCOUNT_CREATED_BY_ADMIN"
      }
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.profile?.displayName ?? user.email,
        role: user.role.toLowerCase(),
        status: user.status.toLowerCase()
      },
      temporaryPassword
    };
  }

  async getActivity() {
    const [events, signals] = await Promise.all([
      this.prisma.activityEvent.findMany({
        include: {
          user: {
            include: { profile: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 150
      }),
      this.prisma.abuseSignal.findMany({
        include: {
          user: {
            include: { profile: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 100
      })
    ]);

    return {
      events: events.map((event) => ({
        id: event.id,
        type: event.type,
        metadata: event.metadata,
        ipHash: event.ipHash,
        userAgent: event.userAgent,
        createdAt: event.createdAt,
        user: event.user
          ? {
              id: event.user.id,
              email: event.user.email,
              displayName: event.user.profile?.displayName ?? event.user.email
            }
          : null
      })),
      signals: signals.map((signal) => ({
        id: signal.id,
        type: signal.type,
        severity: signal.severity.toLowerCase(),
        status: signal.status.toLowerCase(),
        details: signal.details,
        createdAt: signal.createdAt,
        user: signal.user
          ? {
              id: signal.user.id,
              email: signal.user.email,
              displayName: signal.user.profile?.displayName ?? signal.user.email
            }
          : null
      }))
    };
  }

  async getArticles() {
    return this.prisma.article.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        author: {
          include: { profile: true }
        }
      }
    });
  }

  async createArticle(user: ApiSessionUser, payload: AdminArticlePayload) {
    const parsed = this.parseArticlePayload(payload, true);

    return this.prisma.article.create({
      data: {
        title: parsed.title!,
        slug: parsed.slug!,
        excerpt: parsed.excerpt,
        content: parsed.content ?? { blocks: [] },
        status: parsed.status ?? ArticleStatus.DRAFT,
        authorId: user.id,
        publishedAt:
          parsed.status === ArticleStatus.PUBLISHED ? new Date() : null
      }
    });
  }

  async updateArticle(articleId: string, payload: AdminArticlePayload) {
    const existing = await this.prisma.article.findUnique({
      where: { id: articleId }
    });

    if (!existing) {
      throw new NotFoundException("Article not found");
    }

    const parsed = this.parseArticlePayload(payload, false);
    const nextStatus = parsed.status ?? existing.status;

    return this.prisma.article.update({
      where: { id: articleId },
      data: {
        ...(parsed.title !== undefined ? { title: parsed.title } : {}),
        ...(parsed.slug !== undefined ? { slug: parsed.slug } : {}),
        ...(parsed.excerpt !== undefined ? { excerpt: parsed.excerpt } : {}),
        ...(parsed.content !== undefined ? { content: parsed.content } : {}),
        ...(parsed.status !== undefined ? { status: parsed.status } : {}),
        publishedAt:
          nextStatus === ArticleStatus.PUBLISHED
            ? existing.publishedAt ?? new Date()
            : null
      }
    });
  }

  async getSettings() {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: "assistant" }
    });
    const value = this.settingJson(setting?.valueJson);

    const provider =
      typeof value.provider === "string"
        ? value.provider
        : process.env.OPENROUTER_API_KEY
          ? "openrouter"
          : "openai";

    return {
      assistant: {
        provider,
        model:
          value.model ??
          (provider === "openrouter" ? "openai/gpt-4.1-mini" : "gpt-4.1-mini"),
        dailyQuota: value.dailyQuota ?? 20,
        apiKeyConfigured: Boolean(
          setting?.valueEncrypted ||
            (provider === "openrouter"
              ? process.env.OPENROUTER_API_KEY
              : process.env.OPENAI_API_KEY)
        ),
        apiKeySource: setting?.valueEncrypted ? "database" : "environment",
        updatedAt: setting?.updatedAt ?? null
      },
      email: {
        provider: "resend",
        configured: Boolean(process.env.RESEND_API_KEY),
        from: process.env.EMAIL_FROM ?? "Не настроено"
      }
    };
  }

  async updateAssistantSettings(payload: AdminAssistantSettingsPayload) {
    const provider = this.parseRequiredString(payload.provider, "provider", 30);
    if (!["openrouter", "openai"].includes(provider)) {
      throw new BadRequestException("Поддерживаются провайдеры OpenRouter и OpenAI");
    }
    const model = this.parseRequiredString(payload.model, "model", 100);
    const dailyQuota = this.parseInteger(payload.dailyQuota, "dailyQuota", 1, 500);
    const clearApiKey = payload.clearApiKey === true;
    const apiKey =
      payload.apiKey === undefined || payload.apiKey === ""
        ? undefined
        : this.parseRequiredString(payload.apiKey, "apiKey", 500);
    const existing = await this.prisma.appSetting.findUnique({
      where: { key: "assistant" }
    });

    await this.prisma.appSetting.upsert({
      where: { key: "assistant" },
      create: {
        key: "assistant",
        valueJson: { provider, model, dailyQuota },
        valueEncrypted: clearApiKey ? null : apiKey ? this.encrypt(apiKey) : null
      },
      update: {
        valueJson: { provider, model, dailyQuota },
        valueEncrypted: clearApiKey
          ? null
          : apiKey
            ? this.encrypt(apiKey)
            : existing?.valueEncrypted
      }
    });

    return this.getSettings();
  }

  async getCourseMap() {
    const course = await this.prisma.course.findUnique({
      where: { slug: "magic-english-main" },
      include: {
        levels: {
          orderBy: { orderIndex: "asc" },
          include: {
            modules: {
              orderBy: { orderIndex: "asc" },
              include: {
                lessons: {
                  orderBy: { orderIndex: "asc" },
                  select: {
                    id: true,
                    slug: true,
                    title: true,
                    summary: true,
                    orderIndex: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!course) {
      return {
        source: "empty",
        course: null,
        totals: {
          levels: 0,
          modules: 0,
          lessons: 0
        }
      };
    }

    const levels = course.levels.map((level) => ({
      id: level.id,
      code: level.code,
      title: level.title,
      orderIndex: level.orderIndex,
      lessonCount: level.modules.reduce(
        (sum, module) => sum + module.lessons.length,
        0
      ),
      modules: level.modules.map((module) => ({
        id: module.id,
        title: module.title,
        description: module.description,
        orderIndex: module.orderIndex,
        lessonCount: module.lessons.length,
        lessons: module.lessons,
        previewLessons: module.lessons.slice(0, 6)
      }))
    }));

    return {
      source: "database",
      course: {
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description,
        levels
      },
      totals: {
        levels: levels.length,
        modules: levels.reduce((sum, level) => sum + level.modules.length, 0),
        lessons: levels.reduce((sum, level) => sum + level.lessonCount, 0)
      }
    };
  }

  async createModule(payload: AdminModulePayload) {
    const levelId = this.parseRequiredString(payload.levelId, "levelId", 80);
    const title = this.parseRequiredString(payload.title, "title", 180);
    const description = this.parseOptionalString(
      payload.description,
      "description",
      500
    );
    const level = await this.prisma.courseLevel.findUnique({
      where: { id: levelId },
      select: { id: true }
    });

    if (!level) throw new NotFoundException("Уровень не найден");
    const last = await this.prisma.module.aggregate({
      where: { levelId },
      _max: { orderIndex: true }
    });

    const module = await this.prisma.module.create({
      data: {
        levelId,
        title,
        description,
        orderIndex: (last._max.orderIndex ?? 0) + 1
      }
    });

    return module;
  }

  async updateModule(moduleId: string, payload: AdminModulePayload) {
    const existing = await this.prisma.module.findUnique({ where: { id: moduleId } });
    if (!existing) throw new NotFoundException("Группа уроков не найдена");

    return this.prisma.module.update({
      where: { id: moduleId },
      data: {
        ...(payload.title !== undefined
          ? { title: this.parseRequiredString(payload.title, "title", 180) }
          : {}),
        ...(payload.description !== undefined
          ? {
              description: this.parseOptionalString(
                payload.description,
                "description",
                500
              )
            }
          : {})
      }
    });
  }

  async deleteModule(moduleId: string) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: { _count: { select: { lessons: true } } }
    });

    if (!module) throw new NotFoundException("Группа уроков не найдена");
    if (module._count.lessons > 0) {
      throw new BadRequestException(
        "Сначала перенесите или удалите уроки из этой группы"
      );
    }

    await this.prisma.module.delete({ where: { id: moduleId } });
    return { deleted: true };
  }

  async createLesson(payload: AdminCreateLessonPayload) {
    const moduleId = this.parseRequiredString(payload.moduleId, "moduleId", 80);
    const title = this.parseRequiredString(payload.title, "title", 180);
    const summary = this.parseOptionalString(payload.summary, "summary", 500);
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: { level: true }
    });

    if (!module) throw new NotFoundException("Группа уроков не найдена");
    const last = await this.prisma.lesson.aggregate({
      where: { moduleId },
      _max: { orderIndex: true }
    });
    const baseSlug = this.slugify(`${module.level.code}-${title}`) || "lesson";
    let slug = baseSlug;
    let suffix = 2;

    while (await this.prisma.lesson.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return this.prisma.lesson.create({
      data: {
        moduleId,
        slug,
        title,
        summary,
        orderIndex: (last._max.orderIndex ?? 0) + 1,
        blocks: {
          create: {
            type: LessonBlockType.RICH_TEXT,
            orderIndex: 1,
            content: {
              heading: "Материал урока",
              text: "Добавьте содержание урока."
            }
          }
        }
      }
    });
  }

  async moveLesson(slug: string, payload: AdminMoveLessonPayload) {
    const moduleId = this.parseRequiredString(payload.moduleId, "moduleId", 80);
    const orderIndex = this.parseInteger(payload.orderIndex, "orderIndex", 1, 1000);
    const [lesson, targetModule] = await Promise.all([
      this.prisma.lesson.findUnique({ where: { slug } }),
      this.prisma.module.findUnique({ where: { id: moduleId } })
    ]);

    if (!lesson) throw new NotFoundException("Урок не найден");
    if (!targetModule) throw new NotFoundException("Группа уроков не найдена");

    await this.prisma.$transaction(async (transaction) => {
      await transaction.lesson.update({
        where: { id: lesson.id },
        data: { moduleId, orderIndex }
      });
      const affectedModules = [...new Set([lesson.moduleId, moduleId])];

      for (const affectedModuleId of affectedModules) {
        const lessons = await transaction.lesson.findMany({
          where: { moduleId: affectedModuleId },
          orderBy: [{ orderIndex: "asc" }, { title: "asc" }],
          select: { id: true }
        });
        await Promise.all(
          lessons.map((item, index) =>
            transaction.lesson.update({
              where: { id: item.id },
              data: { orderIndex: index + 1 }
            })
          )
        );
      }
    });

    return this.getLessonForEdit(slug);
  }

  async deleteLesson(slug: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { slug },
      select: { id: true, moduleId: true }
    });
    if (!lesson) throw new NotFoundException("Урок не найден");

    await this.prisma.lesson.delete({ where: { id: lesson.id } });
    const remaining = await this.prisma.lesson.findMany({
      where: { moduleId: lesson.moduleId },
      orderBy: { orderIndex: "asc" },
      select: { id: true }
    });
    await this.prisma.$transaction(
      remaining.map((item, index) =>
        this.prisma.lesson.update({
          where: { id: item.id },
          data: { orderIndex: index + 1 }
        })
      )
    );

    return { deleted: true };
  }

  async getDictionary(query?: string) {
    const search = typeof query === "string" ? query.trim() : "";

    const terms = await this.prisma.dictionaryTerm.findMany({
      where: search
        ? {
            OR: [
              { term: { contains: search, mode: "insensitive" } },
              { translation: { contains: search, mode: "insensitive" } },
              { definition: { contains: search, mode: "insensitive" } }
            ]
          }
        : undefined,
      orderBy: { term: "asc" },
      take: 80
    });

    return {
      total: terms.length,
      terms: terms.map((term) => ({
        id: term.id,
        term: term.term,
        translation: term.translation,
        definition: term.definition,
        examples: term.examples
      }))
    };
  }

  async createDictionaryTerm(payload: AdminCreateDictionaryTermPayload) {
    const term = this.parseRequiredString(payload.term, "term", 120);
    const translation = this.parseOptionalString(payload.translation, "translation", 180);
    const definition = this.parseOptionalString(payload.definition, "definition", 600);
    const examples = this.parseStringList(payload.examples, "examples", 8);
    const existingTerm = await this.prisma.dictionaryTerm.findFirst({
      where: {
        term: {
          equals: term,
          mode: "insensitive"
        }
      },
      select: { id: true }
    });

    if (existingTerm) {
      throw new ConflictException("Dictionary term already exists");
    }

    const savedTerm = await this.prisma.dictionaryTerm.create({
      data: {
        term,
        translation,
        definition,
        examples: examples.length > 0 ? examples : Prisma.JsonNull
      }
    });

    return {
      id: savedTerm.id,
      term: savedTerm.term,
      translation: savedTerm.translation,
      definition: savedTerm.definition,
      examples: savedTerm.examples
    };
  }

  async getLessonForEdit(slug: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { slug },
      include: {
        module: {
          include: {
            level: true
          }
        },
        blocks: {
          orderBy: { orderIndex: "asc" }
        }
      }
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson ${slug} not found`);
    }

    return {
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      summary: lesson.summary,
      orderIndex: lesson.orderIndex,
      level: {
        code: lesson.module.level.code,
        title: lesson.module.level.title
      },
      module: {
        id: lesson.module.id,
        title: lesson.module.title,
        orderIndex: lesson.module.orderIndex
      },
      blocks: lesson.blocks.map((block) => ({
        id: block.id,
        type: block.type,
        orderIndex: block.orderIndex,
        content: block.content
      }))
    };
  }

  async updateLesson(slug: string, payload: AdminUpdateLessonPayload) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson ${slug} not found`);
    }

    const title = this.parseTitle(payload.title);
    const summary = this.parseSummary(payload.summary);
    const blocks = this.parseBlocks(payload.blocks);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.lesson.update({
        where: { id: lesson.id },
        data: {
          title,
          summary
        }
      });

      if (blocks) {
        await transaction.lessonBlock.deleteMany({
          where: { lessonId: lesson.id }
        });

        await transaction.lessonBlock.createMany({
          data: blocks.map((block, index) => ({
            lessonId: lesson.id,
            type: block.type,
            orderIndex: index + 1,
            content: block.content
          }))
        });
      }
    });

    return this.getLessonForEdit(slug);
  }

  private parseTitle(value: unknown) {
    if (typeof value !== "string") {
      throw new BadRequestException("title must be a string");
    }

    const title = value.trim();

    if (!title || title.length > 180) {
      throw new BadRequestException("title must be between 1 and 180 characters");
    }

    return title;
  }

  private parseRequiredString(value: unknown, field: string, maxLength: number) {
    if (typeof value !== "string") {
      throw new BadRequestException(`${field} must be a string`);
    }

    const text = value.trim();

    if (!text || text.length > maxLength) {
      throw new BadRequestException(`${field} must be between 1 and ${maxLength} characters`);
    }

    return text;
  }

  private parseOptionalString(value: unknown, field: string, maxLength: number) {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value !== "string") {
      throw new BadRequestException(`${field} must be a string or null`);
    }

    const text = value.trim();

    if (text.length > maxLength) {
      throw new BadRequestException(`${field} must be ${maxLength} characters or less`);
    }

    return text.length > 0 ? text : null;
  }

  private parseEmail(value: unknown) {
    if (typeof value !== "string") {
      throw new BadRequestException("email must be a string");
    }

    const email = value.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180) {
      throw new BadRequestException("Укажите корректную электронную почту");
    }

    return email;
  }

  private generateTemporaryPassword() {
    const alphabet =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    const random = Array.from(randomBytes(14), (byte) => alphabet[byte % alphabet.length]).join("");

    return `Magic-${random}!`;
  }

  private parseStringList(value: unknown, field: string, maxItems: number) {
    if (value === null || value === undefined) {
      return [];
    }

    if (!Array.isArray(value)) {
      throw new BadRequestException(`${field} must be an array`);
    }

    if (value.length > maxItems) {
      throw new BadRequestException(`${field} must contain ${maxItems} items or fewer`);
    }

    return value.map((item, index) => {
      if (typeof item !== "string") {
        throw new BadRequestException(`${field}[${index}] must be a string`);
      }

      return item.trim();
    }).filter(Boolean);
  }

  private parseSummary(value: unknown) {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value !== "string") {
      throw new BadRequestException("summary must be a string or null");
    }

    const summary = value.trim();

    return summary.length > 0 ? summary : null;
  }

  private parseBlocks(value: unknown) {
    if (value === undefined) {
      return null;
    }

    if (!Array.isArray(value)) {
      throw new BadRequestException("blocks must be an array");
    }

    if (value.length === 0 || value.length > 20) {
      throw new BadRequestException("blocks must contain 1 to 20 items");
    }

    return value.map((rawBlock, index) => {
      if (!this.isRecord(rawBlock)) {
        throw new BadRequestException(`blocks[${index}] must be an object`);
      }

      if (!lessonBlockTypes.includes(rawBlock.type as LessonBlockType)) {
        throw new BadRequestException(`blocks[${index}].type is invalid`);
      }

      if (!this.isJsonObject(rawBlock.content)) {
        throw new BadRequestException(`blocks[${index}].content must be a JSON object`);
      }

      return {
        type: rawBlock.type as LessonBlockType,
        content: rawBlock.content as Prisma.InputJsonObject
      };
    });
  }

  private parseArticlePayload(payload: AdminArticlePayload, creating: boolean) {
    const title =
      payload.title === undefined
        ? undefined
        : this.parseRequiredString(payload.title, "title", 180);
    const rawSlug =
      payload.slug === undefined
        ? undefined
        : this.parseRequiredString(payload.slug, "slug", 180);
    const slugSource = rawSlug ?? (creating && title ? title : undefined);
    const slug = slugSource
      ? slugSource
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9а-яё]+/gi, "-")
          .replace(/^-|-$/g, "")
      : undefined;
    const excerpt =
      payload.excerpt === undefined
        ? undefined
        : this.parseOptionalString(payload.excerpt, "excerpt", 500);
    let content: Prisma.InputJsonValue | undefined;

    if (payload.content !== undefined) {
      try {
        JSON.stringify(payload.content);
        content = payload.content as Prisma.InputJsonValue;
      } catch {
        throw new BadRequestException("content must be valid JSON");
      }
    }

    let status: ArticleStatus | undefined;

    if (payload.status !== undefined) {
      if (
        typeof payload.status !== "string" ||
        !Object.values(ArticleStatus).includes(payload.status as ArticleStatus)
      ) {
        throw new BadRequestException("status must be DRAFT, PUBLISHED, or ARCHIVED");
      }

      status = payload.status as ArticleStatus;
    }

    if (creating && (!title || !slug)) {
      throw new BadRequestException("title is required");
    }

    return { title, slug, excerpt, content, status };
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9а-яё]+/gi, "-")
      .replace(/^-|-$/g, "");
  }

  private parseInteger(
    value: unknown,
    field: string,
    minimum: number,
    maximum: number
  ) {
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < minimum ||
      value > maximum
    ) {
      throw new BadRequestException(
        `${field} must be an integer between ${minimum} and ${maximum}`
      );
    }

    return value;
  }

  private settingJson(value: Prisma.JsonValue | undefined) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {} as {
        provider?: string;
        model?: string;
        dailyQuota?: number;
      };
    }

    return value as {
      provider?: string;
      model?: string;
      dailyQuota?: number;
    };
  }

  private encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.settingsKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [iv, authTag, encrypted]
      .map((part) => part.toString("base64url"))
      .join(".");
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

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private isJsonObject(value: unknown): value is Prisma.InputJsonObject {
    if (!this.isRecord(value)) {
      return false;
    }

    try {
      JSON.stringify(value);
      return true;
    } catch {
      return false;
    }
  }
}
