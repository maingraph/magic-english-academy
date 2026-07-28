import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { ApiSessionUser } from "../auth/auth.types";
import { hashPassword, verifyPassword } from "../auth/password";
import { activityStats, localCalendarDate } from "./activity.utils";

export type UpdateProfilePayload = {
  displayName?: unknown;
  avatarUrl?: unknown;
  locale?: unknown;
  timezone?: unknown;
};

export type ChangePasswordPayload = {
  currentPassword?: unknown;
  newPassword?: unknown;
};

@Injectable()
export class ProfileService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getProfile(user: ApiSessionUser) {
    const account = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        profile: true,
        lessonProgress: true,
        taskAttempts: {
          include: {
            task: {
              select: {
                isCheckpoint: true
              }
            }
          }
        },
        userAchievements: {
          include: { achievement: true },
          orderBy: { earnedAt: "desc" }
        },
        enrollments: {
          include: {
            level: true
          }
        }
      }
    });

    return {
      id: account.id,
      email: account.email,
      role: account.role.toLowerCase(),
      status: account.status.toLowerCase(),
      createdAt: account.createdAt,
      profile: {
        displayName: account.profile?.displayName ?? account.email,
        avatarUrl: account.profile?.avatarUrl ?? null,
        locale: account.profile?.locale ?? "ru",
        timezone: account.profile?.timezone ?? "Europe/Warsaw"
      },
      course: {
        currentLevel: account.enrollments[0]?.level.code ?? "A1",
        completedLessons: account.lessonProgress.filter(
          (progress) => progress.status === "COMPLETED"
        ).length,
        taskPoints: account.taskAttempts.reduce(
          (sum, attempt) => sum + attempt.pointsEarned,
          0
        ),
        checkpointCount: account.taskAttempts.filter(
          (attempt) => attempt.isCorrect && attempt.task.isCheckpoint
        ).length
      },
      achievements: account.userAchievements.map((earned) => ({
        code: earned.achievement.code,
        title: earned.achievement.title,
        description: earned.achievement.description,
        earnedAt: earned.earnedAt
      }))
    };
  }

  async updateProfile(user: ApiSessionUser, payload: UpdateProfilePayload) {
    const displayName = this.optionalText(payload.displayName, "displayName", 120);
    const avatarUrl = this.optionalUrl(payload.avatarUrl);
    const locale = this.optionalText(payload.locale, "locale", 12);
    const timezone = this.optionalText(payload.timezone, "timezone", 80);

    await this.prisma.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        displayName: displayName ?? user.displayName,
        avatarUrl,
        locale: locale ?? "ru",
        timezone: timezone ?? "Europe/Warsaw"
      },
      update: {
        ...(displayName !== undefined ? { displayName } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        ...(locale !== undefined ? { locale } : {}),
        ...(timezone !== undefined ? { timezone } : {})
      }
    });

    await this.prisma.activityEvent.create({
      data: {
        userId: user.id,
        type: "PROFILE_UPDATED"
      }
    });

    return this.getProfile(user);
  }

  async changePassword(user: ApiSessionUser, payload: ChangePasswordPayload) {
    const currentPassword = this.requiredPassword(payload.currentPassword, "currentPassword");
    const newPassword = this.requiredPassword(payload.newPassword, "newPassword");
    const account = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { passwordHash: true }
    });

    if (!account.passwordHash || !(await verifyPassword(currentPassword, account.passwordHash))) {
      throw new UnauthorizedException("Текущий пароль указан неверно");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword)
      }
    });

    await this.prisma.activityEvent.create({
      data: {
        userId: user.id,
        type: "PASSWORD_CHANGED"
      }
    });

    return {
      changed: true,
      message: "Пароль обновлён."
    };
  }

  async recordVisit(user: ApiSessionUser) {
    const timezone = await this.getTimezone(user.id);
    const date = this.localDate(new Date(), timezone);

    await this.prisma.userDailyActivity.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date
        }
      },
      create: {
        userId: user.id,
        date,
        source: "PLATFORM_VISIT"
      },
      update: {
        source: "PLATFORM_VISIT"
      }
    });

    return {
      recorded: true,
      date: date.toISOString().slice(0, 10),
      timezone
    };
  }

  async getActivity(user: ApiSessionUser, monthsValue?: string) {
    const months = this.parseMonths(monthsValue);
    const timezone = await this.getTimezone(user.id);
    const today = this.localDate(new Date(), timezone);
    const start = new Date(today);
    start.setUTCDate(start.getUTCDate() - months * 31);

    const rows = await this.prisma.userDailyActivity.findMany({
      where: {
        userId: user.id,
        date: { gte: start, lte: today }
      },
      orderBy: { date: "asc" },
      select: { date: true }
    });
    const activeDays = rows.map((row) => row.date.toISOString().slice(0, 10));
    const { weeklyDays, streakWeeks } = activityStats(activeDays, today);

    return {
      timezone,
      months,
      today: today.toISOString().slice(0, 10),
      activeDays,
      weeklyDays,
      streakWeeks
    };
  }

  private optionalText(value: unknown, field: string, maxLength: number) {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value !== "string") {
      throw new BadRequestException(`${field} must be a string`);
    }

    const text = value.trim();

    if (!text || text.length > maxLength) {
      throw new BadRequestException(`${field} must be between 1 and ${maxLength} characters`);
    }

    return text;
  }

  private optionalUrl(value: unknown) {
    if (value === undefined) {
      return undefined;
    }

    if (value === null || value === "") {
      return null;
    }

    if (typeof value !== "string" || value.length > 500) {
      throw new BadRequestException("avatarUrl must be a valid URL");
    }

    try {
      const url = new URL(value);

      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Unsupported protocol");
      }

      return url.toString();
    } catch {
      throw new BadRequestException("avatarUrl must be a valid HTTP(S) URL");
    }
  }

  private requiredPassword(value: unknown, field: string) {
    if (typeof value !== "string" || value.length < 8 || value.length > 128) {
      throw new BadRequestException(`${field} must contain 8 to 128 characters`);
    }

    return value;
  }

  private async getTimezone(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { timezone: true }
    });
    const timezone = profile?.timezone ?? "Europe/Warsaw";

    try {
      new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format();
      return timezone;
    } catch {
      return "Europe/Warsaw";
    }
  }

  private localDate(now: Date, timezone: string) {
    return localCalendarDate(now, timezone);
  }

  private parseMonths(value?: string) {
    const parsed = Number(value ?? 6);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 12) {
      throw new BadRequestException("months must be an integer between 1 and 12");
    }
    return parsed;
  }
}
