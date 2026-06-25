import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { LessonBlockType, TaskType } from "@prisma/client";
import type { ApiSessionUser } from "../auth/auth.types";
import { GamificationService } from "../gamification/gamification.service";
import { PrismaService } from "../prisma/prisma.service";

export type AnswerTaskPayload = {
  blockOrder?: unknown;
  answer?: unknown;
};

export type SubmitHomeworkPayload = {
  text?: unknown;
};

export type ReviewHomeworkPayload = {
  score?: unknown;
  feedback?: unknown;
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
            type: LessonBlockType.TASK,
            orderIndex: blockOrder
          }
        }
      }
    });

    if (!lesson) {
      throw new NotFoundException("Урок не найден");
    }

    const block = lesson.blocks[0];
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

  async submitHomework(
    user: ApiSessionUser,
    slug: string,
    payload: SubmitHomeworkPayload
  ) {
    const text = this.text(payload.text, "text", 5000, 20);
    const lesson = await this.prisma.lesson.findUnique({
      where: { slug },
      select: { id: true, title: true }
    });

    if (!lesson) {
      throw new NotFoundException("Урок не найден");
    }

    const submission = await this.prisma.homeworkSubmission.create({
      data: {
        userId: user.id,
        lessonId: lesson.id,
        content: { text }
      }
    });

    await this.prisma.activityEvent.create({
      data: {
        userId: user.id,
        type: "HOMEWORK_SUBMITTED",
        metadata: {
          submissionId: submission.id,
          lessonSlug: slug
        }
      }
    });
    await this.gamificationService.syncForUser(user.id);

    return {
      id: submission.id,
      lesson: {
        slug,
        title: lesson.title
      },
      status: "pending",
      submittedAt: submission.createdAt
    };
  }

  async getMyHomework(user: ApiSessionUser) {
    const submissions = await this.prisma.homeworkSubmission.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" }
    });
    const lessonIds = [...new Set(submissions.map((submission) => submission.lessonId))];
    const lessons = await this.prisma.lesson.findMany({
      where: { id: { in: lessonIds } },
      select: { id: true, slug: true, title: true }
    });
    const lessonMap = new Map(lessons.map((lesson) => [lesson.id, lesson]));

    return submissions.map((submission) => ({
      id: submission.id,
      lesson: lessonMap.get(submission.lessonId) ?? null,
      content: submission.content,
      score: submission.score,
      feedback: submission.feedback,
      status: submission.reviewedAt ? "reviewed" : "pending",
      submittedAt: submission.createdAt,
      reviewedAt: submission.reviewedAt
    }));
  }

  async getHomeworkQueue() {
    const submissions = await this.prisma.homeworkSubmission.findMany({
      orderBy: [{ reviewedAt: "asc" }, { createdAt: "asc" }],
      include: {
        user: {
          include: { profile: true }
        }
      }
    });
    const lessonIds = [...new Set(submissions.map((submission) => submission.lessonId))];
    const lessons = await this.prisma.lesson.findMany({
      where: { id: { in: lessonIds } },
      select: { id: true, slug: true, title: true }
    });
    const lessonMap = new Map(lessons.map((lesson) => [lesson.id, lesson]));

    return submissions.map((submission) => ({
      id: submission.id,
      student: {
        id: submission.user.id,
        displayName: submission.user.profile?.displayName ?? submission.user.email,
        email: submission.user.email
      },
      lesson: lessonMap.get(submission.lessonId) ?? null,
      content: submission.content,
      score: submission.score,
      feedback: submission.feedback,
      status: submission.reviewedAt ? "reviewed" : "pending",
      submittedAt: submission.createdAt,
      reviewedAt: submission.reviewedAt
    }));
  }

  async reviewHomework(
    reviewer: ApiSessionUser,
    submissionId: string,
    payload: ReviewHomeworkPayload
  ) {
    const score = this.integer(payload.score, "score", 0, 100);
    const feedback = this.text(payload.feedback, "feedback", 2000, 3);
    const existing = await this.prisma.homeworkSubmission.findUnique({
      where: { id: submissionId }
    });

    if (!existing) {
      throw new NotFoundException("Домашняя работа не найдена");
    }

    const submission = await this.prisma.homeworkSubmission.update({
      where: { id: submissionId },
      data: {
        score,
        feedback,
        reviewedAt: new Date()
      }
    });

    await this.prisma.activityEvent.createMany({
      data: [
        {
          userId: existing.userId,
          type: "HOMEWORK_REVIEWED",
          metadata: { submissionId, score }
        },
        {
          userId: reviewer.id,
          type: "HOMEWORK_REVIEW_CREATED",
          metadata: { submissionId, score }
        }
      ]
    });

    return {
      id: submission.id,
      score: submission.score,
      feedback: submission.feedback,
      status: "reviewed",
      reviewedAt: submission.reviewedAt
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
