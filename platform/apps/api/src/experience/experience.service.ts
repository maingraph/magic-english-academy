import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { Prisma, TrainingMode } from "@prisma/client";
import { State, type Card, type Grade } from "ts-fsrs";
import type { ApiSessionUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { ExperienceEmailService } from "./experience-email.service";
import { bookingStatus, campaignDeliveryKey, certificateEligible, confidenceForState, outboxRetry, scheduleReview } from "./experience.utils";

type Payload = Record<string, unknown>;

const weekdayCodes = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
const trainingModes = new Set(Object.values(TrainingMode));

@Injectable()
export class ExperienceService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ExperienceEmailService) private readonly email: ExperienceEmailService
  ) {}

  async dashboard(user: ApiSessionUser) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
    const [account, plan, activities, upcoming, dueReviews, unread, feedPosts, achievements] =
      await Promise.all([
        this.prisma.user.findUniqueOrThrow({
          where: { id: user.id },
          include: {
            profile: true,
            enrollments: {
              include: {
                level: {
                  include: {
                    modules: { orderBy: { orderIndex: "asc" }, include: { lessons: { orderBy: { orderIndex: "asc" } } } }
                  }
                }
              }
            },
            lessonProgress: true
          }
        }),
        this.getStudyPlan(user),
        this.prisma.userDailyActivity.findMany({
          where: { userId: user.id, date: { gte: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()) } },
          orderBy: { date: "asc" }
        }),
        this.prisma.calendarEvent.findMany({
          where: { userId: user.id, startsAt: { gte: now }, status: "SCHEDULED" },
          orderBy: { startsAt: "asc" },
          take: 6
        }),
        this.prisma.userDictionaryTerm.count({ where: { userId: user.id, dueAt: { lte: now } } }),
        this.prisma.notification.count({ where: { userId: user.id, readAt: null } }),
        this.prisma.feedPost.count({ where: { status: "PUBLISHED", publishedAt: { gte: weekAgo, lte: now } } }),
        this.prisma.userAchievement.findMany({
          where: { userId: user.id },
          orderBy: { earnedAt: "desc" },
          take: 3,
          include: { achievement: true }
        })
      ]);

    const progressByLesson = new Map(account.lessonProgress.map((item) => [item.lessonId, item]));
    const levels = account.enrollments
      .map((enrollment) => enrollment.level)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((level) => {
        const lessons = level.modules.flatMap((module) => module.lessons);
        const completed = lessons.filter((lesson) => progressByLesson.get(lesson.id)?.status === "COMPLETED").length;
        return {
          code: level.code,
          title: level.title,
          total: lessons.length,
          completed,
          percent: lessons.length ? Math.round((completed / lessons.length) * 100) : 0
        };
      });
    const nextLesson = account.enrollments
      .sort((a, b) => a.level.orderIndex - b.level.orderIndex)
      .flatMap((enrollment) =>
        enrollment.level.modules.flatMap((module) =>
          module.lessons.map((lesson) => ({ ...lesson, levelCode: enrollment.level.code, moduleTitle: module.title }))
        )
      )
      .find((lesson) => progressByLesson.get(lesson.id)?.status !== "COMPLETED");
    const streakDays = this.currentStreak(activities.map((activity) => activity.date));
    const activeWeekdays = new Set(
      activities
        .filter((activity) => activity.date >= weekAgo)
        .map((activity) => activity.date.toISOString().slice(0, 10))
    ).size;

    return {
      user: { displayName: account.profile?.displayName ?? user.displayName, avatarUrl: account.profile?.avatarUrl },
      nextLesson: nextLesson
        ? {
            slug: nextLesson.slug,
            title: nextLesson.title,
            summary: nextLesson.summary,
            estimatedMinutes: nextLesson.estimatedMinutes,
            skill: nextLesson.skill,
            levelCode: nextLesson.levelCode,
            moduleTitle: nextLesson.moduleTitle,
            status: progressByLesson.get(nextLesson.id)?.status ?? "NOT_STARTED"
          }
        : null,
      weeklyGoal: { target: plan.sessionsPerWeek, completed: activeWeekdays },
      levels,
      schedule: upcoming,
      recommendations: { dueReviews, newFeedPosts: feedPosts },
      streak: {
        days: streakDays,
        weeks: Math.floor(streakDays / 7),
        petStage: streakDays >= 30 ? 4 : streakDays >= 14 ? 3 : streakDays >= 7 ? 2 : streakDays >= 3 ? 1 : 0
      },
      unreadNotifications: unread,
      achievements,
      activity: activities.map((item) => item.date.toISOString().slice(0, 10))
    };
  }

  async search(user: ApiSessionUser, rawQuery?: string) {
    const query = (rawQuery ?? "").trim().slice(0, 120);
    if (query.length < 2) return { query, results: [] };
    const contains = { contains: query, mode: "insensitive" as const };
    const [lessons, words, notes, materials, articles] = await Promise.all([
      this.prisma.lesson.findMany({
        where: { OR: [{ title: contains }, { summary: contains }] },
        take: 8,
        include: { module: { include: { level: true } } }
      }),
      this.prisma.userDictionaryTerm.findMany({
        where: { userId: user.id, term: { OR: [{ term: contains }, { translation: contains }] } },
        take: 8,
        include: { term: true }
      }),
      this.prisma.userNote.findMany({
        where: { userId: user.id, OR: [{ title: contains }, { text: contains }] },
        take: 8
      }),
      this.prisma.libraryMaterial.findMany({
        where: { status: "PUBLISHED", OR: [{ title: contains }, { description: contains }] },
        take: 8
      }),
      this.prisma.article.findMany({
        where: { status: "PUBLISHED", OR: [{ title: contains }, { excerpt: contains }] },
        take: 8
      })
    ]);
    return {
      query,
      results: [
        ...lessons.map((item) => ({ type: "lesson", id: item.id, title: item.title, subtitle: item.module.level.code, href: `/courses/${item.module.level.code.toLowerCase()}/lessons/${item.slug}` })),
        ...words.map((item) => ({ type: "word", id: item.termId, title: item.term.term, subtitle: item.term.translation, href: "/dictionary" })),
        ...notes.map((item) => ({ type: "note", id: item.id, title: item.title, subtitle: item.text.slice(0, 100), href: "/notes" })),
        ...materials.map((item) => ({ type: "library", id: item.id, title: item.title, subtitle: item.description, href: "/library" })),
        ...articles.map((item) => ({ type: "article", id: item.id, title: item.title, subtitle: item.excerpt, href: `/articles/${item.slug}` }))
      ].slice(0, 24)
    };
  }

  getStudyPlan(user: ApiSessionUser) {
    return this.prisma.userStudyPlan.upsert({
      where: { userId: user.id },
      create: { userId: user.id, preferredDays: ["пн", "ср", "пт"] },
      update: {}
    });
  }

  updateStudyPlan(user: ApiSessionUser, payload: Payload) {
    const sessionsPerWeek = this.integer(payload.sessionsPerWeek, 2, 7, "Количество занятий");
    const sessionMinutes = this.integer(payload.sessionMinutes, 15, 90, "Длительность занятия");
    const preferredDays = this.stringArray(payload.preferredDays).filter((day) => weekdayCodes.includes(day));
    const preferredTime = this.string(payload.preferredTime, "Время");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(preferredTime)) throw new BadRequestException("Некорректное время");
    return this.prisma.userStudyPlan.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        sessionsPerWeek,
        sessionMinutes,
        preferredDays,
        preferredTime,
        targetDate: this.optionalDate(payload.targetDate),
        reminderEnabled: this.boolean(payload.reminderEnabled, true),
        reminderMinutes: this.integer(payload.reminderMinutes ?? 30, 0, 10_080, "Напоминание"),
        autoReschedule: this.boolean(payload.autoReschedule, false)
      },
      update: {
        sessionsPerWeek,
        sessionMinutes,
        preferredDays,
        preferredTime,
        targetDate: this.optionalDate(payload.targetDate),
        reminderEnabled: this.boolean(payload.reminderEnabled, true),
        reminderMinutes: this.integer(payload.reminderMinutes ?? 30, 0, 10_080, "Напоминание"),
        autoReschedule: this.boolean(payload.autoReschedule, false)
      }
    });
  }

  async calendar(user: ApiSessionUser, fromRaw?: string, toRaw?: string) {
    const now = new Date();
    const from = fromRaw ? this.date(fromRaw, "Начало периода") : new Date(now.getTime() - 7 * 86_400_000);
    const to = toRaw ? this.date(toRaw, "Конец периода") : new Date(now.getTime() + 42 * 86_400_000);
    const [events, clubs] = await Promise.all([
      this.prisma.calendarEvent.findMany({ where: { userId: user.id, startsAt: { gte: from, lte: to } }, orderBy: { startsAt: "asc" } }),
      this.prisma.speakingClub.findMany({
        where: { startsAt: { gte: from, lte: to }, status: "SCHEDULED" },
        orderBy: { startsAt: "asc" },
        include: { bookings: { where: { userId: user.id } } }
      })
    ]);
    return { events, clubs };
  }

  createCalendarEvent(user: ApiSessionUser, payload: Payload) {
    const startsAt = this.date(payload.startsAt, "Начало события");
    const endsAt = payload.endsAt ? this.date(payload.endsAt, "Конец события") : null;
    if (endsAt && endsAt <= startsAt) throw new BadRequestException("Конец события должен быть позже начала");
    return this.prisma.calendarEvent.create({
      data: { userId: user.id, type: "PERSONAL", title: this.string(payload.title, "Название", 120), startsAt, endsAt }
    });
  }

  async updateCalendarEvent(user: ApiSessionUser, eventId: string, payload: Payload) {
    const event = await this.ownedEvent(user.id, eventId);
    if (event.type !== "PERSONAL") throw new ForbiddenException("Системное событие нельзя редактировать");
    return this.prisma.calendarEvent.update({
      where: { id: event.id },
      data: {
        ...(payload.title !== undefined ? { title: this.string(payload.title, "Название", 120) } : {}),
        ...(payload.startsAt !== undefined ? { startsAt: this.date(payload.startsAt, "Начало события") } : {}),
        ...(payload.endsAt !== undefined ? { endsAt: payload.endsAt ? this.date(payload.endsAt, "Конец события") : null } : {}),
        ...(payload.status !== undefined && ["SCHEDULED", "COMPLETED", "MISSED", "CANCELLED"].includes(String(payload.status))
          ? { status: String(payload.status) as "SCHEDULED" | "COMPLETED" | "MISSED" | "CANCELLED" }
          : {})
      }
    });
  }

  async removeCalendarEvent(user: ApiSessionUser, eventId: string) {
    const event = await this.ownedEvent(user.id, eventId);
    if (event.type !== "PERSONAL") throw new ForbiddenException("Системное событие нельзя удалить");
    await this.prisma.calendarEvent.delete({ where: { id: event.id } });
    return { deleted: true };
  }

  notifications(user: ApiSessionUser, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId: user.id, ...(unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: "desc" },
      take: 80
    });
  }

  async readNotification(user: ApiSessionUser, id: string) {
    const result = await this.prisma.notification.updateMany({ where: { id, userId: user.id }, data: { readAt: new Date() } });
    if (!result.count) throw new NotFoundException("Уведомление не найдено");
    return { read: true };
  }

  async readAllNotifications(user: ApiSessionUser) {
    const result = await this.prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
    return { updated: result.count };
  }

  notificationPreferences(user: ApiSessionUser) {
    return this.prisma.notificationPreference.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
  }

  updateNotificationPreferences(user: ApiSessionUser, payload: Payload) {
    const data = {
      courseUpdatesEmail: this.boolean(payload.courseUpdatesEmail, true),
      remindersEmail: this.boolean(payload.remindersEmail, true),
      achievementsEmail: this.boolean(payload.achievementsEmail, true),
      communityEmail: this.boolean(payload.communityEmail, true)
    };
    return this.prisma.notificationPreference.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
  }

  dueTraining(user: ApiSessionUser, rawLimit?: string) {
    const limit = Math.min(Math.max(Number(rawLimit) || 20, 1), 100);
    return this.prisma.userDictionaryTerm.findMany({
      where: { userId: user.id, dueAt: { lte: new Date() } },
      orderBy: [{ dueAt: "asc" }, { savedAt: "asc" }],
      take: limit,
      include: { term: true }
    });
  }

  async startTraining(user: ApiSessionUser, payload: Payload) {
    const mode = String(payload.mode ?? "CHOICE").toUpperCase() as TrainingMode;
    if (!trainingModes.has(mode)) throw new BadRequestException("Неизвестный режим тренировки");
    const limit = this.integer(payload.limit ?? 12, 1, 50, "Количество карточек");
    const terms = await this.prisma.userDictionaryTerm.findMany({
      where: {
        userId: user.id,
        dueAt: { lte: new Date() },
        ...(mode === "PERSONAL_SET" && payload.setName ? { setName: this.string(payload.setName, "Набор", 80) } : {})
      },
      orderBy: [{ dueAt: "asc" }, { savedAt: "asc" }],
      take: limit,
      include: { term: true }
    });
    const session = await this.prisma.trainingSession.create({ data: { userId: user.id, mode, total: terms.length } });
    return { session, cards: terms.map((item) => this.trainingCard(item, mode)) };
  }

  async answerTraining(user: ApiSessionUser, sessionId: string, payload: Payload) {
    const session = await this.prisma.trainingSession.findFirst({ where: { id: sessionId, userId: user.id, status: "ACTIVE" } });
    if (!session) throw new NotFoundException("Активная тренировка не найдена");
    const termId = this.string(payload.termId, "Слово");
    const saved = await this.prisma.userDictionaryTerm.findUnique({
      where: { userId_termId: { userId: user.id, termId } },
      include: { term: true }
    });
    if (!saved) throw new NotFoundException("Слово не найдено в словаре");
    const answer = this.string(payload.answer ?? "", "Ответ", 500);
    const expected = [saved.term.translation, saved.term.term].filter(Boolean) as string[];
    const isCorrect = expected.some((value) => this.normalize(value) === this.normalize(answer));
    const rating = this.integer(payload.rating ?? (isCorrect ? 3 : 1), 1, 4, "Оценка");
    const now = new Date();
    const card: Card | null = saved.repetitions === 0
      ? null
      : {
          due: saved.dueAt,
          stability: saved.stability,
          difficulty: saved.difficulty,
          elapsed_days: saved.lastReviewedAt ? Math.max(0, Math.round((now.getTime() - saved.lastReviewedAt.getTime()) / 86_400_000)) : 0,
          scheduled_days: saved.scheduledDays,
          learning_steps: saved.learningSteps,
          reps: saved.repetitions,
          lapses: saved.lapses,
          state: saved.fsrsState as State,
          last_review: saved.lastReviewedAt ?? undefined
        };
    const scheduled = scheduleReview(card, rating as Grade, now);
    const nextCombo = isCorrect ? session.combo + 1 : 0;
    const xp = isCorrect ? 10 + Math.min(nextCombo, 10) : 1;
    const confidence = confidenceForState(scheduled.state);

    const [, answerRecord, updatedSession] = await this.prisma.$transaction([
      this.prisma.userDictionaryTerm.update({
        where: { userId_termId: { userId: user.id, termId } },
        data: {
          dueAt: scheduled.due,
          stability: scheduled.stability,
          difficulty: scheduled.difficulty,
          scheduledDays: scheduled.scheduled_days,
          learningSteps: scheduled.learning_steps,
          repetitions: scheduled.reps,
          lapses: scheduled.lapses,
          fsrsState: scheduled.state,
          lastReviewedAt: now,
          confidence
        }
      }),
      this.prisma.trainingAnswer.create({
        data: {
          sessionId,
          termId,
          prompt: { term: saved.term.term, translation: saved.term.translation },
          answer: { value: answer },
          isCorrect,
          rating,
          xpEarned: xp
        }
      }),
      this.prisma.trainingSession.update({
        where: { id: sessionId },
        data: {
          correct: { increment: isCorrect ? 1 : 0 },
          combo: nextCombo,
          maxCombo: Math.max(session.maxCombo, nextCombo),
          xpEarned: { increment: xp }
        }
      }),
      this.prisma.dictionaryReviewLog.create({
        data: {
          userId: user.id,
          termId,
          rating,
          state: scheduled.state,
          dueAt: scheduled.due,
          stability: scheduled.stability,
          difficulty: scheduled.difficulty,
          scheduledDays: scheduled.scheduled_days,
          reviewedAt: now
        }
      })
    ]);
    return { answer: answerRecord, session: updatedSession, dueAt: scheduled.due, confidence };
  }

  async completeTraining(user: ApiSessionUser, sessionId: string) {
    const result = await this.prisma.trainingSession.updateMany({
      where: { id: sessionId, userId: user.id, status: "ACTIVE" },
      data: { status: "COMPLETED", completedAt: new Date() }
    });
    if (!result.count) throw new NotFoundException("Активная тренировка не найдена");
    return this.prisma.trainingSession.findUniqueOrThrow({ where: { id: sessionId }, include: { answers: true } });
  }

  async library(user: ApiSessionUser, filters: { query?: string; type?: string; saved: boolean }) {
    const query = filters.query?.trim().slice(0, 120);
    const materials = await this.prisma.libraryMaterial.findMany({
      where: {
        status: "PUBLISHED",
        ...(query ? { OR: [{ title: { contains: query, mode: "insensitive" } }, { description: { contains: query, mode: "insensitive" } }] } : {}),
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      include: { saves: { where: { userId: user.id } }, asset: true }
    });
    const normalizedType = filters.type?.toUpperCase();
    return materials
      .filter((item) => !normalizedType || item.type === normalizedType)
      .filter((item) => !filters.saved || item.saves.length > 0)
      .map((item) => ({ ...item, saved: item.saves.length > 0, saves: undefined }));
  }

  async toggleMaterialSave(user: ApiSessionUser, materialId: string, save: boolean) {
    const material = await this.prisma.libraryMaterial.findFirst({ where: { id: materialId, status: "PUBLISHED" } });
    if (!material) throw new NotFoundException("Материал не найден");
    if (save) {
      await this.prisma.librarySave.upsert({ where: { materialId_userId: { materialId, userId: user.id } }, create: { materialId, userId: user.id }, update: {} });
    } else {
      await this.prisma.librarySave.deleteMany({ where: { materialId, userId: user.id } });
    }
    return { saved: save };
  }

  speakingClubs(user: ApiSessionUser) {
    return this.prisma.speakingClub.findMany({
      where: { status: "SCHEDULED", startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      include: { bookings: { where: { userId: user.id } }, _count: { select: { bookings: { where: { status: "BOOKED" } } } } }
    });
  }

  async bookSpeakingClub(user: ApiSessionUser, clubId: string) {
    return this.prisma.$transaction(async (tx) => {
      const club = await tx.speakingClub.findFirst({ where: { id: clubId, status: "SCHEDULED", startsAt: { gt: new Date() } } });
      if (!club) throw new NotFoundException("Разговорный клуб не найден");
      const booked = await tx.speakingClubBooking.count({ where: { clubId, status: "BOOKED" } });
      const status = bookingStatus(booked, club.capacity);
      const booking = await tx.speakingClubBooking.upsert({
        where: { clubId_userId: { clubId, userId: user.id } },
        create: { clubId, userId: user.id, status },
        update: { status }
      });
      await tx.calendarEvent.upsert({
        where: { id: `club-${clubId}-${user.id}` },
        create: { id: `club-${clubId}-${user.id}`, userId: user.id, type: "SPEAKING_CLUB", title: club.title, startsAt: club.startsAt, sourceId: club.id },
        update: { status: "SCHEDULED", startsAt: club.startsAt, title: club.title }
      });
      return booking;
    });
  }

  async cancelSpeakingClub(user: ApiSessionUser, clubId: string) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.speakingClubBooking.findUnique({ where: { clubId_userId: { clubId, userId: user.id } } });
      if (!booking || booking.status === "CANCELLED") throw new NotFoundException("Бронирование не найдено");
      await tx.speakingClubBooking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
      await tx.calendarEvent.updateMany({ where: { userId: user.id, sourceId: clubId, type: "SPEAKING_CLUB" }, data: { status: "CANCELLED" } });
      let promoted = null;
      if (booking.status === "BOOKED") {
        const next = await tx.speakingClubBooking.findFirst({ where: { clubId, status: "WAITLISTED" }, orderBy: { createdAt: "asc" } });
        if (next) {
          promoted = await tx.speakingClubBooking.update({ where: { id: next.id }, data: { status: "BOOKED" } });
          const club = await tx.speakingClub.findUniqueOrThrow({ where: { id: clubId } });
          await tx.notification.create({ data: { userId: next.userId, title: "Место освободилось", body: `Вы записаны на «${club.title}»`, href: "/calendar" } });
        }
      }
      return { cancelled: true, promoted };
    });
  }

  async certificates(user: ApiSessionUser) {
    await this.issueEligibleCertificates(user.id);
    const [issued, levels] = await Promise.all([
      this.prisma.certificate.findMany({ where: { userId: user.id }, orderBy: { issuedAt: "desc" } }),
      this.prisma.courseLevel.findMany({ orderBy: { orderIndex: "asc" }, select: { id: true, code: true, title: true } })
    ]);
    return levels.map((level) => ({ ...level, certificate: issued.find((certificate) => certificate.courseLevel === level.code) ?? null }));
  }

  async toggleLessonBookmark(user: ApiSessionUser, slug: string, save: boolean) {
    const lesson = await this.prisma.lesson.findUnique({ where: { slug } });
    if (!lesson) throw new NotFoundException("Урок не найден");
    if (save) await this.prisma.lessonBookmark.upsert({ where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } }, create: { userId: user.id, lessonId: lesson.id }, update: {} });
    else await this.prisma.lessonBookmark.deleteMany({ where: { userId: user.id, lessonId: lesson.id } });
    return { bookmarked: save };
  }

  async reactToLesson(user: ApiSessionUser, slug: string, payload: Payload) {
    const reaction = this.string(payload.reaction, "Реакция", 32);
    if (!["useful", "clear", "hard", "love"].includes(reaction)) throw new BadRequestException("Неизвестная реакция");
    const lesson = await this.prisma.lesson.findUnique({ where: { slug } });
    if (!lesson) throw new NotFoundException("Урок не найден");
    return this.prisma.lessonReaction.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
      create: { userId: user.id, lessonId: lesson.id, reaction },
      update: { reaction }
    });
  }

  async voteInPoll(user: ApiSessionUser, pollId: string, payload: Payload) {
    const optionId = this.string(payload.optionId, "Вариант ответа");
    const poll = await this.prisma.feedPoll.findUnique({ where: { id: pollId }, include: { options: true } });
    if (!poll || (poll.closesAt && poll.closesAt < new Date())) throw new NotFoundException("Опрос недоступен");
    if (!poll.options.some((option) => option.id === optionId)) throw new BadRequestException("Вариант не относится к опросу");
    const vote = await this.prisma.feedPollVote.upsert({
      where: { pollId_userId: { pollId, userId: user.id } },
      create: { pollId, optionId, userId: user.id },
      update: { optionId }
    });
    const totals = await this.prisma.feedPollVote.groupBy({ by: ["optionId"], where: { pollId }, _count: true });
    return { vote, totals };
  }

  async verifyCertificate(token: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { verificationToken: token },
      include: { user: { include: { profile: true } } }
    });
    if (!certificate) throw new NotFoundException("Сертификат не найден");
    return {
      valid: certificate.status === "ISSUED",
      holder: certificate.user.profile?.displayName ?? certificate.user.email,
      level: certificate.courseLevel,
      score: certificate.score,
      issuedAt: certificate.issuedAt,
      revokedAt: certificate.revokedAt
    };
  }

  async certificateDocument(user: ApiSessionUser, certificateId: string) {
    const certificate = await this.prisma.certificate.findFirst({ where: { id: certificateId, userId: user.id, status: "ISSUED" }, include: { user: { include: { profile: true } } } });
    if (!certificate) throw new NotFoundException("Сертификат не найден");
    const holder = certificate.user.profile?.displayName ?? certificate.user.email;
    const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char] ?? char));
    const date = new Intl.DateTimeFormat("ru", { dateStyle: "long" }).format(certificate.issuedAt);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="990" viewBox="0 0 1400 990"><rect width="1400" height="990" fill="#fffaf0"/><rect x="42" y="42" width="1316" height="906" rx="32" fill="none" stroke="#f0a018" stroke-width="4"/><circle cx="700" cy="190" r="56" fill="#f0a018"/><text x="700" y="207" text-anchor="middle" font-family="Montserrat,Arial" font-size="48" fill="#fff">✦</text><text x="700" y="310" text-anchor="middle" font-family="Montserrat,Arial" font-size="28" font-weight="700" fill="#9a6508">MAGIC ENGLISH</text><text x="700" y="400" text-anchor="middle" font-family="Montserrat,Arial" font-size="52" font-weight="700" fill="#201d18">Сертификат уровня ${escape(certificate.courseLevel)}</text><text x="700" y="490" text-anchor="middle" font-family="Montserrat,Arial" font-size="24" fill="#746d62">подтверждает завершение программы</text><text x="700" y="585" text-anchor="middle" font-family="Montserrat,Arial" font-size="42" font-weight="700" fill="#201d18">${escape(holder)}</text><text x="700" y="670" text-anchor="middle" font-family="Montserrat,Arial" font-size="24" fill="#746d62">Итоговый результат: ${certificate.score}%</text><text x="700" y="760" text-anchor="middle" font-family="Montserrat,Arial" font-size="20" fill="#746d62">${escape(date)}</text><text x="700" y="860" text-anchor="middle" font-family="Montserrat,Arial" font-size="15" fill="#9d9589">Проверка: ${escape(certificate.verificationToken)}</text></svg>`;
    return { level: certificate.courseLevel.toLowerCase(), svg };
  }

  async adminAnalytics() {
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 86_400_000);
    const [users, active, active7, completions, attempts, clubs, campaigns, deliveryGroups, levels, difficultTasks, startedUsers] = await Promise.all([
      this.prisma.user.count({ where: { role: "STUDENT" } }),
      this.prisma.userDailyActivity.groupBy({ by: ["userId"], where: { date: { gte: monthAgo } } }),
      this.prisma.userDailyActivity.groupBy({ by: ["userId"], where: { date: { gte: new Date(now.getTime() - 7 * 86_400_000) } } }),
      this.prisma.lessonProgress.count({ where: { status: "COMPLETED", completedAt: { gte: monthAgo } } }),
      this.prisma.taskAttempt.aggregate({ where: { createdAt: { gte: monthAgo } }, _count: true, _avg: { pointsEarned: true } }),
      this.prisma.speakingClub.count({ where: { startsAt: { gte: now } } }),
      this.prisma.notificationCampaign.count(),
      this.prisma.emailDelivery.groupBy({ by: ["status"], _count: true }),
      this.prisma.courseLevel.findMany({ include: { modules: { include: { lessons: { include: { progress: true } } } } }, orderBy: { orderIndex: "asc" } }),
      this.prisma.task.findMany({ include: { attempts: { where: { createdAt: { gte: monthAgo } }, select: { isCorrect: true } }, lesson: { select: { title: true } } } }),
      this.prisma.lessonProgress.groupBy({ by: ["userId"] })
    ]);
    const completionByLevel = levels.map((level) => {
      const lessons = level.modules.flatMap((module) => module.lessons);
      const totalProgress = lessons.reduce((sum, lesson) => sum + lesson.progress.length, 0);
      const completedProgress = lessons.reduce((sum, lesson) => sum + lesson.progress.filter((item) => item.status === "COMPLETED").length, 0);
      return { code: level.code, percent: totalProgress ? Math.round(completedProgress / totalProgress * 100) : 0, completed: completedProgress, records: totalProgress };
    });
    const difficultTopics = difficultTasks.filter((task) => task.attempts.length >= 3).map((task) => ({ id: task.id, title: task.lesson.title, attempts: task.attempts.length, accuracy: Math.round(task.attempts.filter((item) => item.isCorrect).length / task.attempts.length * 100) })).sort((a, b) => a.accuracy - b.accuracy).slice(0, 10);
    return {
      users,
      activeUsers30d: active.length,
      activeUsers7d: active7.length,
      retention7to30: active.length ? Math.round(active7.length / active.length * 100) : 0,
      lessonCompletions30d: completions,
      taskAttempts30d: attempts._count,
      averagePoints: attempts._avg.pointsEarned ?? 0,
      upcomingClubs: clubs,
      campaigns,
      funnel: { accounts: users, started: startedUsers.length, active30d: active.length },
      completionByLevel,
      difficultTopics,
      emailDelivery: deliveryGroups
    };
  }

  async createCampaign(user: ApiSessionUser, payload: Payload) {
    const scheduledAt = payload.scheduledAt ? this.date(payload.scheduledAt, "Дата отправки") : null;
    return this.prisma.notificationCampaign.create({
      data: {
        createdById: user.id,
        title: this.string(payload.title, "Заголовок", 120),
        body: this.string(payload.body, "Текст", 2_000),
        href: payload.href ? this.string(payload.href, "Ссылка", 500) : null,
        channels: this.stringArray(payload.channels).length ? this.stringArray(payload.channels) : ["IN_APP"],
        audience: this.object(payload.audience, { type: "ALL" }) as Prisma.InputJsonValue,
        scheduledAt,
        status: payload.publish === true ? "SCHEDULED" : "DRAFT"
      }
    });
  }

  adminCampaigns() {
    return this.prisma.notificationCampaign.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { notifications: true, emailDeliveries: true } } } });
  }

  adminCreateSpeakingClub(payload: Payload) {
    return this.prisma.speakingClub.create({ data: this.clubData(payload, false) as Prisma.SpeakingClubCreateInput });
  }

  adminUpdateSpeakingClub(clubId: string, payload: Payload) {
    return this.prisma.speakingClub.update({ where: { id: clubId }, data: this.clubData(payload, true) });
  }

  adminSpeakingClubs() {
    return this.prisma.speakingClub.findMany({ orderBy: { startsAt: "desc" }, include: { bookings: { include: { user: { include: { profile: true } } } } } });
  }

  async adminUpdateAttendance(clubId: string, bookingId: string, payload: Payload) {
    const status = this.string(payload.status, "Статус", 40).toUpperCase();
    if (!["ATTENDED", "MISSED", "BOOKED", "WAITLISTED", "CANCELLED"].includes(status)) throw new BadRequestException("Неизвестный статус посещения");
    const booking = await this.prisma.speakingClubBooking.findFirst({ where: { id: bookingId, clubId } });
    if (!booking) throw new NotFoundException("Участник не найден");
    return this.prisma.speakingClubBooking.update({ where: { id: booking.id }, data: { status: status as "ATTENDED" | "MISSED" | "BOOKED" | "WAITLISTED" | "CANCELLED" } });
  }

  adminCreateMaterial(user: ApiSessionUser, payload: Payload) {
    return this.prisma.libraryMaterial.create({ data: { createdById: user.id, ...this.materialData(payload, false) } as Prisma.LibraryMaterialUncheckedCreateInput });
  }

  adminUpdateMaterial(materialId: string, payload: Payload) {
    return this.prisma.libraryMaterial.update({ where: { id: materialId }, data: this.materialData(payload, true) });
  }

  adminLibrary() {
    return this.prisma.libraryMaterial.findMany({ orderBy: { createdAt: "desc" }, include: { asset: true, _count: { select: { saves: true } } } });
  }

  revokeCertificate(certificateId: string) {
    return this.prisma.certificate.update({ where: { id: certificateId }, data: { status: "REVOKED", revokedAt: new Date() } });
  }

  async dispatchScheduledWork(authorization?: string) {
    const secret = process.env.CRON_SECRET;
    if (!secret || secret.length < 16 || authorization !== `Bearer ${secret}`) throw new UnauthorizedException("Invalid cron authorization");
    const now = new Date();
    const campaigns = await this.prisma.notificationCampaign.findMany({
      where: { status: "SCHEDULED", OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }] },
      take: 20
    });
    for (const campaign of campaigns) await this.dispatchCampaign(campaign.id);

    await this.prisma.feedPost.updateMany({
      where: { status: "DRAFT", scheduledAt: { lte: now } },
      data: { status: "PUBLISHED", publishedAt: now }
    });
    await this.rescheduleMissedEvents(now);
    await this.enqueueReminders(now);

    const jobs = await this.prisma.outboxJob.findMany({ where: { status: "PENDING", runAt: { lte: now } }, orderBy: { runAt: "asc" }, take: 50 });
    let completed = 0;
    let failed = 0;
    for (const job of jobs) {
      const claimed = await this.prisma.outboxJob.updateMany({ where: { id: job.id, status: "PENDING" }, data: { status: "PROCESSING", lockedAt: new Date(), attempts: { increment: 1 } } });
      if (!claimed.count) continue;
      try {
        const payload = this.object(job.payload, {});
        if (job.type === "EMAIL_DELIVERY") await this.email.sendDelivery(this.string(payload.deliveryId, "Delivery id"));
        await this.prisma.outboxJob.update({ where: { id: job.id }, data: { status: "COMPLETED", completedAt: new Date() } });
        completed += 1;
      } catch (error) {
        const terminalStatus = outboxRetry(job.attempts, job.maxAttempts);
        await this.prisma.outboxJob.update({
          where: { id: job.id },
          data: { status: terminalStatus, runAt: new Date(Date.now() + 5 * 60_000), lastError: error instanceof Error ? error.message.slice(0, 1_000) : "Unknown error" }
        });
        failed += 1;
      }
    }
    return { campaigns: campaigns.length, completed, failed };
  }

  private async dispatchCampaign(campaignId: string) {
    await this.prisma.$transaction(async (tx) => {
      const campaign = await tx.notificationCampaign.findUniqueOrThrow({ where: { id: campaignId } });
      if (campaign.status !== "SCHEDULED") return;
      const audience = this.object(campaign.audience, { type: "ALL" });
      const level = typeof audience.level === "string" ? audience.level : undefined;
      const users = await tx.user.findMany({
        where: { role: "STUDENT", status: "ACTIVE", ...(level ? { enrollments: { some: { level: { code: level } } } } : {}) },
        include: { notificationPrefs: true }
      });
      const channels = this.stringArray(campaign.channels);
      if (channels.includes("IN_APP")) {
        await tx.notification.createMany({ data: users.map((target) => ({ userId: target.id, campaignId, title: campaign.title, body: campaign.body, href: campaign.href })) });
      }
      if (channels.includes("EMAIL")) {
        for (const target of users.filter((item) => item.notificationPrefs?.courseUpdatesEmail !== false)) {
          const delivery = await tx.emailDelivery.create({
            data: { userId: target.id, campaignId, recipient: target.email, subject: campaign.title, body: campaign.body, idempotencyKey: campaignDeliveryKey(campaignId, target.id) }
          });
          await tx.outboxJob.create({ data: { type: "EMAIL_DELIVERY", payload: { deliveryId: delivery.id } } });
        }
      }
      await tx.notificationCampaign.update({ where: { id: campaignId }, data: { status: "SENT", sentAt: new Date() } });
    });
  }

  private async enqueueReminders(now: Date) {
    const horizon = new Date(now.getTime() + 35 * 60_000);
    const events = await this.prisma.calendarEvent.findMany({
      where: { status: "SCHEDULED", reminderSentAt: null, startsAt: { gte: now, lte: horizon } },
      include: { user: { include: { notificationPrefs: true, studyPlan: true } } },
      take: 100
    });
    for (const event of events) {
      await this.prisma.$transaction(async (tx) => {
        await tx.notification.create({ data: { userId: event.userId, title: "Скоро занятие", body: event.title, href: "/calendar" } });
        if (event.user.studyPlan?.reminderEnabled !== false && event.user.notificationPrefs?.remindersEmail !== false) {
          const delivery = await tx.emailDelivery.upsert({
            where: { idempotencyKey: `reminder:event:${event.id}:user:${event.userId}` },
            create: { userId: event.userId, recipient: event.user.email, subject: "Скоро занятие Magic English", body: event.title, idempotencyKey: `reminder:event:${event.id}:user:${event.userId}` },
            update: {}
          });
          await tx.outboxJob.create({ data: { type: "EMAIL_DELIVERY", payload: { deliveryId: delivery.id } } });
        }
        await tx.calendarEvent.update({ where: { id: event.id }, data: { reminderSentAt: now } });
      });
    }
  }

  private async rescheduleMissedEvents(now: Date) {
    const missed = await this.prisma.calendarEvent.findMany({
      where: { status: "SCHEDULED", startsAt: { lt: new Date(now.getTime() - 60 * 60_000) } },
      include: { user: { include: { studyPlan: true } } },
      take: 100
    });
    for (const event of missed) {
      await this.prisma.$transaction(async (tx) => {
        await tx.calendarEvent.update({ where: { id: event.id }, data: { status: "MISSED" } });
        if (event.user.studyPlan?.autoReschedule && ["LESSON", "REVIEW", "PERSONAL"].includes(event.type)) {
          const shift = 7 * 86_400_000;
          await tx.calendarEvent.create({
            data: { userId: event.userId, type: event.type, title: event.title, startsAt: new Date(event.startsAt.getTime() + shift), endsAt: event.endsAt ? new Date(event.endsAt.getTime() + shift) : null, sourceId: event.sourceId, metadata: event.metadata ?? undefined }
          });
        }
      });
    }
  }

  private async issueEligibleCertificates(userId: string) {
    const levels = await this.prisma.courseLevel.findMany({
      include: { modules: { include: { lessons: { include: { tasks: true } } } } }
    });
    const progress = await this.prisma.lessonProgress.findMany({ where: { userId, status: "COMPLETED" } });
    const completedIds = new Set(progress.map((item) => item.lessonId));
    for (const level of levels) {
      const lessons = level.modules.flatMap((module) => module.lessons);
      const completedLessonCount = lessons.filter((lesson) => completedIds.has(lesson.id)).length;
      if (!lessons.length || completedLessonCount !== lessons.length) continue;
      const checkpointIds = lessons.flatMap((lesson) => lesson.tasks.filter((task) => task.isCheckpoint).map((task) => task.id));
      if (!checkpointIds.length) continue;
      const correct = await this.prisma.taskAttempt.findMany({ where: { userId, taskId: { in: checkpointIds }, isCorrect: true }, distinct: ["taskId"] });
      if (!certificateEligible(lessons.length, completedLessonCount, checkpointIds.length, correct.length)) continue;
      const existing = await this.prisma.certificate.findFirst({ where: { userId, courseLevel: level.code, status: "ISSUED" } });
      if (!existing) await this.prisma.certificate.create({ data: { userId, courseLevel: level.code, score: 100 } });
    }
  }

  private clubData(payload: Payload, partial: boolean) {
    const data: Prisma.SpeakingClubUpdateInput = {};
    if (!partial || payload.title !== undefined) data.title = this.string(payload.title, "Название", 160);
    if (!partial || payload.startsAt !== undefined) data.startsAt = this.date(payload.startsAt, "Дата клуба");
    if (!partial || payload.description !== undefined) data.description = payload.description ? this.string(payload.description, "Описание", 2_000) : null;
    if (!partial || payload.levelCodes !== undefined) data.levelCodes = this.stringArray(payload.levelCodes);
    if (!partial || payload.durationMinutes !== undefined) data.durationMinutes = this.integer(payload.durationMinutes ?? 45, 15, 240, "Длительность");
    if (!partial || payload.capacity !== undefined) data.capacity = this.integer(payload.capacity ?? 16, 1, 500, "Вместимость");
    if (!partial || payload.meetingUrl !== undefined) data.meetingUrl = payload.meetingUrl ? this.string(payload.meetingUrl, "Ссылка", 1_000) : null;
    if (!partial || payload.materials !== undefined) data.materials = this.stringArray(payload.materials);
    if (partial && payload.status !== undefined) data.status = this.string(payload.status, "Статус", 40);
    return data;
  }

  private materialData(payload: Payload, partial: boolean) {
    const data: Prisma.LibraryMaterialUncheckedUpdateInput = {};
    if (!partial || payload.title !== undefined) data.title = this.string(payload.title, "Название", 180);
    if (!partial || payload.type !== undefined) data.type = this.string(payload.type, "Тип", 40).toUpperCase() as "LINK" | "VIDEO" | "AUDIO" | "FILE" | "GUIDE" | "CHECKLIST" | "TEMPLATE" | "COLLECTION";
    if (!partial || payload.description !== undefined) data.description = payload.description ? this.string(payload.description, "Описание", 4_000) : null;
    if (!partial || payload.url !== undefined) data.url = payload.url ? this.string(payload.url, "Ссылка", 1_000) : null;
    if (!partial || payload.assetId !== undefined) data.assetId = payload.assetId ? this.string(payload.assetId, "Файл") : null;
    if (!partial || payload.levels !== undefined) data.levels = this.stringArray(payload.levels);
    if (!partial || payload.skills !== undefined) data.skills = this.stringArray(payload.skills);
    if (!partial || payload.tags !== undefined) data.tags = this.stringArray(payload.tags);
    if (!partial || payload.status !== undefined) {
      const status = this.string(payload.status ?? "DRAFT", "Статус", 40).toUpperCase();
      if (!["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) throw new BadRequestException("Неизвестный статус материала");
      data.status = status as "DRAFT" | "PUBLISHED" | "ARCHIVED";
      data.publishedAt = status === "PUBLISHED" ? new Date() : null;
    }
    return data;
  }

  private trainingCard(item: { termId: string; term: { term: string; translation: string | null; definition: string | null } }, mode: TrainingMode) {
    const base = { termId: item.termId, term: item.term.term, translation: item.term.translation, definition: item.term.definition };
    if (mode === "LETTERS") return { ...base, prompt: item.term.translation ?? item.term.definition, letters: [...item.term.term].sort(() => Math.random() - 0.5) };
    if (mode === "CONTEXT") return { ...base, prompt: item.term.definition ?? item.term.translation };
    return { ...base, prompt: item.term.term };
  }

  private async ownedEvent(userId: string, eventId: string) {
    const event = await this.prisma.calendarEvent.findFirst({ where: { id: eventId, userId } });
    if (!event) throw new NotFoundException("Событие не найдено");
    return event;
  }

  private currentStreak(dates: Date[]) {
    const days = new Set(dates.map((date) => date.toISOString().slice(0, 10)));
    let cursor = new Date();
    let streak = 0;
    if (!days.has(cursor.toISOString().slice(0, 10))) cursor = new Date(cursor.getTime() - 86_400_000);
    while (days.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor = new Date(cursor.getTime() - 86_400_000);
    }
    return streak;
  }

  private normalize(value: string) {
    return value.trim().toLocaleLowerCase("ru").replace(/[.,!?;:'"`]/g, "").replace(/\s+/g, " ");
  }

  private string(value: unknown, label: string, max = 200) {
    if (typeof value !== "string" || !value.trim()) throw new BadRequestException(`${label}: обязательное поле`);
    return value.trim().slice(0, max);
  }

  private stringArray(value: unknown) {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 50) : [];
  }

  private object(value: unknown, fallback: Payload) {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Payload : fallback;
  }

  private integer(value: unknown, min: number, max: number, label: string) {
    const result = Number(value);
    if (!Number.isInteger(result) || result < min || result > max) throw new BadRequestException(`${label}: ожидается число от ${min} до ${max}`);
    return result;
  }

  private boolean(value: unknown, fallback: boolean) {
    return typeof value === "boolean" ? value : fallback;
  }

  private date(value: unknown, label: string) {
    const result = new Date(String(value));
    if (Number.isNaN(result.getTime())) throw new BadRequestException(`${label}: некорректная дата`);
    return result;
  }

  private optionalDate(value: unknown) {
    return value ? this.date(value, "Дата цели") : null;
  }
}
