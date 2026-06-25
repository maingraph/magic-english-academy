import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { ApiSessionUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";

const achievementDefinitions = [
  {
    code: "FIRST_LESSON",
    title: "Первый шаг",
    description: "Завершите первый урок.",
    rule: { type: "completed_lessons", target: 1 }
  },
  {
    code: "FIRST_HOMEWORK",
    title: "Первая домашняя работа",
    description: "Отправьте первую домашнюю работу.",
    rule: { type: "homework_submissions", target: 1 }
  },
  {
    code: "THREE_DAY_STREAK",
    title: "Отличный темп",
    description: "Занимайтесь три дня подряд.",
    rule: { type: "active_days", target: 3 }
  },
  {
    code: "COURSE_COMPLETE",
    title: "Выпускник Magic English",
    description: "Завершите все уроки курса.",
    rule: { type: "course_completion", target: 100 }
  }
] as const;

type AchievementCode = (typeof achievementDefinitions)[number]["code"];

@Injectable()
export class GamificationService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getAchievements(user: ApiSessionUser) {
    await this.ensureDefinitions();
    await this.syncForUser(user.id);

    const [definitions, earned, totalLessons, completedLessons, homeworkCount, activity] =
      await Promise.all([
        this.prisma.achievement.findMany({ orderBy: { code: "asc" } }),
        this.prisma.userAchievement.findMany({
          where: { userId: user.id },
          include: { achievement: true }
        }),
        this.prisma.lesson.count(),
        this.prisma.lessonProgress.count({
          where: { userId: user.id, status: "COMPLETED" }
        }),
        this.prisma.homeworkSubmission.count({
          where: { userId: user.id }
        }),
        this.prisma.activityEvent.findMany({
          where: { userId: user.id },
          select: { createdAt: true }
        })
      ]);
    const earnedMap = new Map(earned.map((item) => [item.achievementId, item.earnedAt]));
    const activeDates = activity.map((event) => event.createdAt);
    const activeDays = new Set(
      activeDates.map((date) => date.toISOString().slice(0, 10))
    ).size;
    const streak = this.currentStreak(activeDates);

    return {
      earnedCount: earned.length,
      totalCount: definitions.length,
      achievements: definitions.map((achievement) => {
        const rule = achievement.rule as { type?: string; target?: number };
        const progress = this.getRuleProgress(
          rule.type,
          totalLessons,
          completedLessons,
          homeworkCount,
          rule.type === "active_days" ? streak : activeDays
        );

        return {
          code: achievement.code,
          title: achievement.title,
          description: achievement.description,
          earned: earnedMap.has(achievement.id),
          earnedAt: earnedMap.get(achievement.id) ?? null,
          progress: Math.min(progress, rule.target ?? 1),
          target: rule.target ?? 1
        };
      })
    };
  }

  async getLeaderboard(user: ApiSessionUser, rawPeriod?: string) {
    const period = rawPeriod ?? "week";

    if (!["day", "week", "month"].includes(period)) {
      throw new BadRequestException("Период должен быть day, week или month");
    }

    const days = period === "day" ? 1 : period === "week" ? 7 : 30;
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const users = await this.prisma.user.findMany({
      where: {
        status: "ACTIVE",
        role: "STUDENT"
      },
      include: {
        profile: true,
        taskAttempts: {
          where: { createdAt: { gte: start } }
        },
        homeworkSubmissions: {
          where: { createdAt: { gte: start } }
        },
        activityEvents: {
          where: { createdAt: { gte: start } },
          select: { createdAt: true }
        }
      }
    });

    const entries = users
      .map((account) => {
        const taskPoints = account.taskAttempts.reduce(
          (sum, attempt) => sum + attempt.pointsEarned,
          0
        );
        const homeworkPoints = account.homeworkSubmissions.reduce(
          (sum, submission) => sum + (submission.score ?? 0),
          0
        );
        const correct = account.taskAttempts.filter((attempt) => attempt.isCorrect).length;
        const accuracy =
          account.taskAttempts.length === 0
            ? 0
            : Math.round((correct / account.taskAttempts.length) * 100);
        const activeDays = new Set(
          account.activityEvents.map((event) => event.createdAt.toISOString().slice(0, 10))
        ).size;

        return {
          userId: account.id,
          displayName: account.profile?.displayName ?? account.email,
          avatarUrl: account.profile?.avatarUrl ?? null,
          points: taskPoints + homeworkPoints,
          taskPoints,
          homeworkPoints,
          accuracy,
          activeDays
        };
      })
      .sort(
        (left, right) =>
          right.points - left.points ||
          right.accuracy - left.accuracy ||
          right.activeDays - left.activeDays
      )
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
        isCurrentUser: entry.userId === user.id
      }));

    return {
      period,
      startsAt: start,
      generatedAt: new Date(),
      entries
    };
  }

  async syncForUser(userId: string) {
    await this.ensureDefinitions();

    const [totalLessons, completedLessons, homeworkCount, events] = await Promise.all([
      this.prisma.lesson.count(),
      this.prisma.lessonProgress.count({
        where: { userId, status: "COMPLETED" }
      }),
      this.prisma.homeworkSubmission.count({ where: { userId } }),
      this.prisma.activityEvent.findMany({
        where: { userId },
        select: { createdAt: true }
      })
    ]);
    const activeDays = this.currentStreak(events.map((event) => event.createdAt));
    const earnedCodes: AchievementCode[] = [];

    if (completedLessons >= 1) earnedCodes.push("FIRST_LESSON");
    if (homeworkCount >= 1) earnedCodes.push("FIRST_HOMEWORK");
    if (activeDays >= 3) earnedCodes.push("THREE_DAY_STREAK");
    if (totalLessons > 0 && completedLessons >= totalLessons) {
      earnedCodes.push("COURSE_COMPLETE");
    }

    for (const code of earnedCodes) {
      await this.award(userId, code);
    }
  }

  private async award(userId: string, code: AchievementCode) {
    const achievement = await this.prisma.achievement.findUniqueOrThrow({
      where: { code }
    });
    const existing = await this.prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId,
          achievementId: achievement.id
        }
      }
    });

    if (existing) {
      return;
    }

    try {
      await this.prisma.userAchievement.create({
        data: {
          userId,
          achievementId: achievement.id
        }
      });
      await this.sendAchievementEmail(userId, achievement.title, achievement.description);
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
        throw error;
      }
    }
  }

  private async ensureDefinitions() {
    await Promise.all(
      achievementDefinitions.map((achievement) =>
        this.prisma.achievement.upsert({
          where: { code: achievement.code },
          create: achievement,
          update: {
            title: achievement.title,
            description: achievement.description,
            rule: achievement.rule
          }
        })
      )
    );
  }

  private getRuleProgress(
    type: string | undefined,
    totalLessons: number,
    completedLessons: number,
    homeworkCount: number,
    activeDays: number
  ) {
    if (type === "completed_lessons") return completedLessons;
    if (type === "homework_submissions") return homeworkCount;
    if (type === "active_days") return activeDays;
    if (type === "course_completion") {
      return totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
    }

    return 0;
  }

  private currentStreak(dates: Date[]) {
    const days = new Set(dates.map((date) => date.toISOString().slice(0, 10)));
    let cursor = new Date();
    let streak = 0;

    for (;;) {
      const key = cursor.toISOString().slice(0, 10);

      if (!days.has(key)) {
        break;
      }

      streak += 1;
      cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
    }

    return streak;
  }

  private async sendAchievementEmail(
    userId: string,
    title: string,
    description: string
  ) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    if (!user) {
      return;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Magic English <achievements@magic-english-academy.com>",
        to: [user.email],
        subject: `Новое достижение: ${title}`,
        html: this.achievementEmailHtml(
          user.profile?.displayName ?? user.email,
          title,
          description
        )
      })
    });

    if (!response.ok) {
      console.error(`Achievement email failed: ${response.status}`);
    }
  }

  private achievementEmailHtml(name: string, title: string, description: string) {
    return `
      <div style="background:#f6f6f6;padding:32px;font-family:Arial,sans-serif;color:#2c2c2c">
        <div style="max-width:560px;margin:auto;background:#fff;border:1px solid #ececec;border-radius:8px;overflow:hidden">
          <div style="background:#feb733;padding:24px 28px;color:#fff;font-weight:800;font-size:22px">MAGIC ENGLISH</div>
          <div style="padding:32px 28px">
            <p style="margin:0 0 12px;color:#777">Отличная работа, ${this.escapeHtml(name)}!</p>
            <h1 style="margin:0 0 12px;font-size:28px">${this.escapeHtml(title)}</h1>
            <p style="margin:0 0 24px;line-height:1.6;color:#555">${this.escapeHtml(description)}</p>
            <a href="${process.env.WEB_ORIGIN ?? "http://localhost:3000"}/achievements" style="display:inline-block;background:#2c2c2c;color:#fff;padding:13px 20px;border-radius:6px;text-decoration:none;font-weight:700">Посмотреть достижение</a>
          </div>
        </div>
      </div>
    `;
  }

  private escapeHtml(value: string) {
    return value.replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        })[character] ?? character
    );
  }
}
