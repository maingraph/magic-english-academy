import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { LessonBlockType, TaskType } from "@prisma/client";
import type { ApiSessionUser } from "../auth/auth.types";
import { GamificationService } from "../gamification/gamification.service";
import { PrismaService } from "../prisma/prisma.service";

export type AnswerTaskPayload = {
  blockOrder?: unknown;
  answer?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

@Injectable()
export class LearningService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(GamificationService)
    private readonly gamificationService: GamificationService
  ) {}

  async answerTask(user: ApiSessionUser, slug: string, payload: AnswerTaskPayload) {
    const blockOrder = this.integer(payload.blockOrder, "blockOrder", 1, 1000);
    const answer = this.text(payload.answer, "answer", 500);
    const lesson = await this.prisma.lesson.findUnique({
      where: { slug },
      include: {
        blocks: {
          where: {
            type: { in: [LessonBlockType.TASK, LessonBlockType.ASSESSMENT] },
            orderIndex: blockOrder
          }
        }
      }
    });

    if (!lesson) {
      throw new NotFoundException("Урок не найден");
    }

    const block = lesson.blocks[0];
    const isCheckpoint = block?.type === LessonBlockType.ASSESSMENT;
    const content = isRecord(block?.content) ? block.content : {};
    const correctAnswer = typeof content.answer === "string" ? content.answer.trim() : "";
    const prompt = typeof content.prompt === "string" ? content.prompt : "";
    const options = Array.isArray(content.options)
      ? content.options.filter((item): item is string => typeof item === "string")
      : [];

    if (!block || !correctAnswer) {
      throw new NotFoundException("Интерактивное задание не найдено");
    }

    const isCorrect = answer.localeCompare(correctAnswer, undefined, {
      sensitivity: "accent"
    }) === 0;
    let task = await this.prisma.task.findFirst({
      where: {
        lessonId: lesson.id,
        orderIndex: blockOrder
      }
    });

    if (!task) {
      task = await this.prisma.task.create({
        data: {
          lessonId: lesson.id,
          type: TaskType.MULTIPLE_CHOICE,
          prompt: { prompt, blockOrder },
          points: 10,
          isCheckpoint,
          orderIndex: blockOrder,
          options: {
            create: options.map((option) => ({
              value: option,
              isCorrect: option === correctAnswer
            }))
          }
        }
      });
    }

    const previousCorrect = await this.prisma.taskAttempt.findFirst({
      where: {
        userId: user.id,
        taskId: task.id,
        isCorrect: true
      },
      select: { id: true }
    });
    const pointsEarned = isCorrect && !previousCorrect ? task.points : 0;

    await this.prisma.$transaction([
      this.prisma.taskAttempt.create({
        data: {
          userId: user.id,
          taskId: task.id,
          answer: { value: answer },
          isCorrect,
          pointsEarned,
          feedback: isCorrect ? "Верно" : "Попробуйте ещё раз"
        }
      }),
      this.prisma.activityEvent.create({
        data: {
          userId: user.id,
          type: "TASK_ANSWERED",
          metadata: {
            lessonSlug: slug,
            blockOrder,
            isCorrect,
            pointsEarned
          }
        }
      })
    ]);

    await this.gamificationService.syncForUser(user.id);

    return {
      correct: isCorrect,
      pointsEarned,
      answer: correctAnswer,
      feedback: isCorrect
        ? pointsEarned > 0
          ? `Верно. +${pointsEarned} баллов.`
          : "Верно. Баллы за это задание уже были начислены."
        : "Пока неверно. Попробуйте другой вариант."
    };
  }

  private text(
    value: unknown,
    field: string,
    maxLength: number,
    minLength = 1
  ) {
    if (typeof value !== "string") {
      throw new BadRequestException(`${field} must be a string`);
    }

    const text = value.trim();

    if (text.length < minLength || text.length > maxLength) {
      throw new BadRequestException(
        `${field} must be between ${minLength} and ${maxLength} characters`
      );
    }

    return text;
  }

  private integer(
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
}
