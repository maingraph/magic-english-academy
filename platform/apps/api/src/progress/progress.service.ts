import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ProgressStatus, UserRole } from "@prisma/client";
import type { ApiRole, ApiSessionUser } from "../auth/auth.types";
import { GamificationService } from "../gamification/gamification.service";
import { PrismaService } from "../prisma/prisma.service";
import { canUnlockLevel } from "./unlock.utils";

const roleMap: Record<ApiRole, UserRole> = {
  student: UserRole.STUDENT,
  teacher: UserRole.TEACHER,
  admin: UserRole.ADMIN,
  owner: UserRole.OWNER
};

const placementQuestions = [
  {
    id: "q1",
    prompt: "She ___ a teacher.",
    options: ["am", "is", "are"],
    answer: "is"
  },
  {
    id: "q2",
    prompt: "Yesterday we ___ to the cinema.",
    options: ["go", "went", "have gone"],
    answer: "went"
  },
  {
    id: "q3",
    prompt: "I ___ this book already.",
    options: ["read", "have read", "am reading"],
    answer: "have read"
  },
  {
    id: "q4",
    prompt: "If I had known, I ___ you.",
    options: ["would tell", "would have told", "told"],
    answer: "would have told"
  },
  {
    id: "q5",
    prompt: "Rarely ___ such a convincing argument.",
    options: ["I heard", "have I heard", "I have heard"],
    answer: "have I heard"
  }
] as const;

@Injectable()
export class ProgressService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(GamificationService)
    private readonly gamificationService: GamificationService
  ) {}

  async getSummary(user: ApiSessionUser) {
    await this.ensureUser(user);

    const [totalLessons, completedLessons, inProgressLessons, levelProgress, nextLessons] =
      await Promise.all([
        this.prisma.lesson.count(),
        this.prisma.lessonProgress.count({
          where: { userId: user.id, status: ProgressStatus.COMPLETED }
        }),
        this.prisma.lessonProgress.count({
          where: { userId: user.id, status: ProgressStatus.IN_PROGRESS }
        }),
        this.getAllLevelProgress(user),
        this.getNextLessons(user.id)
      ]);

    const currentLevel = [...levelProgress]
      .reverse()
      .find((level) => level.isUnlocked && level.completedLessons < level.totalLessons)
      ?? levelProgress.find((level) => level.isUnlocked)
      ?? null;

    return {
      user,
      totals: {
        lessons: totalLessons,
        completedLessons,
        inProgressLessons,
        percent: totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100)
      },
      currentLevel: currentLevel?.code ?? "A1",
      levelProgress,
      nextLessons
    };
  }

  getPlacementTest() {
    return {
      questions: placementQuestions.map(({ answer: _answer, ...question }) => question)
    };
  }

  async submitPlacementTest(user: ApiSessionUser, rawAnswers: unknown) {
    await this.ensureUser(user);

    if (!Array.isArray(rawAnswers) || rawAnswers.length !== placementQuestions.length) {
      throw new BadRequestException("Ответьте на все вопросы входного теста");
    }

    const answers = rawAnswers.map((answer) =>
      typeof answer === "string" ? answer.trim() : ""
    );
    const score = placementQuestions.reduce(
      (total, question, index) => total + (answers[index] === question.answer ? 1 : 0),
      0
    );
    const targetIndex = score >= 5 ? 4 : score >= 4 ? 3 : score >= 3 ? 2 : score >= 2 ? 1 : 0;
    const levels = await this.prisma.courseLevel.findMany({
      orderBy: { orderIndex: "asc" },
      select: { id: true, code: true, orderIndex: true }
    });
    const unlocked = levels.slice(0, targetIndex + 1);

    await this.prisma.$transaction([
      ...unlocked.map((level) =>
        this.prisma.enrollment.upsert({
          where: { userId_levelId: { userId: user.id, levelId: level.id } },
          create: { userId: user.id, levelId: level.id },
          update: { endsAt: null }
        })
      ),
      this.prisma.activityEvent.create({
        data: {
          userId: user.id,
          type: "PLACEMENT_TEST_COMPLETED",
          metadata: {
            score,
            levelCode: unlocked.at(-1)?.code ?? "A1"
          }
        }
      })
    ]);

    return {
      score,
      total: placementQuestions.length,
      levelCode: unlocked.at(-1)?.code ?? "A1",
      message: `Открыт уровень ${unlocked.at(-1)?.code ?? "A1"}`
    };
  }

  async getLevelProgress(user: ApiSessionUser, code: string) {
    await this.ensureUser(user);

    const levels = await this.getAllLevelProgress(user);
    const level = levels.find(
      (item) => item.code.toLowerCase() === code.toLowerCase()
    );

    if (!level) {
      throw new NotFoundException(`Course level ${code} not found`);
    }

    return level;
  }

  async markLessonStarted(user: ApiSessionUser, slug: string) {
    const { lesson, currentStatus } = await this.prepareProgressUpdate(user, slug);

    if (currentStatus === ProgressStatus.COMPLETED) {
      return this.getLessonProgressResponse(user.id, lesson.slug);
    }

    await this.prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId: user.id,
          lessonId: lesson.id
        }
      },
      create: {
        userId: user.id,
        lessonId: lesson.id,
        status: ProgressStatus.IN_PROGRESS
      },
      update: {
        status: ProgressStatus.IN_PROGRESS,
        completedAt: null
      }
    });

    await this.prisma.activityEvent.create({
      data: {
        userId: user.id,
        type: "LESSON_STARTED",
        metadata: { lessonSlug: slug }
      }
    });
    await this.gamificationService.syncForUser(user.id);

    return this.getLessonProgressResponse(user.id, lesson.slug);
  }

  async markLessonCompleted(user: ApiSessionUser, slug: string) {
    const { lesson } = await this.prepareProgressUpdate(user, slug);

    await this.prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId: user.id,
          lessonId: lesson.id
        }
      },
      create: {
        userId: user.id,
        lessonId: lesson.id,
        status: ProgressStatus.COMPLETED,
        completedAt: new Date()
      },
      update: {
        status: ProgressStatus.COMPLETED,
        completedAt: new Date()
      }
    });
    await this.unlockNextLevelIfEligible(user.id, lesson.id);
    await this.prisma.activityEvent.create({
      data: {
        userId: user.id,
        type: "LESSON_COMPLETED",
        metadata: { lessonSlug: slug }
      }
    });
    await this.gamificationService.syncForUser(user.id);

    return this.getLessonProgressResponse(user.id, lesson.slug);
  }

  private async prepareProgressUpdate(user: ApiSessionUser, slug: string) {
    await this.ensureUser(user);

    const lesson = await this.prisma.lesson.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        module: {
          select: {
            level: { select: { id: true, code: true, orderIndex: true } }
          }
        }
      }
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson ${slug} not found`);
    }
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_levelId: {
          userId: user.id,
          levelId: lesson.module.level.id
        }
      }
    });

    if (lesson.module.level.orderIndex > 1 && !enrollment) {
      throw new ForbiddenException("Этот уровень пока закрыт");
    }

    const progress = await this.prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId: user.id,
          lessonId: lesson.id
        }
      }
    });

    return { lesson, currentStatus: progress?.status };
  }

  private async getLessonProgressResponse(userId: string, slug: string) {
    const lesson = await this.prisma.lesson.findUniqueOrThrow({
      where: { slug },
      select: {
        slug: true,
        title: true,
        progress: {
          where: { userId },
          select: {
            status: true,
            completedAt: true,
            updatedAt: true
          }
        }
      }
    });

    return {
      slug: lesson.slug,
      title: lesson.title,
      status: lesson.progress[0]?.status ?? ProgressStatus.NOT_STARTED,
      completedAt: lesson.progress[0]?.completedAt ?? null,
      updatedAt: lesson.progress[0]?.updatedAt ?? null
    };
  }

  private async getAllLevelProgress(user: ApiSessionUser) {
    const [levels, enrollments] = await Promise.all([
      this.prisma.courseLevel.findMany({
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
                orderIndex: true,
                progress: {
                  where: { userId: user.id },
                  select: { status: true }
                }
              }
            }
          }
        }
      }
      }),
      this.prisma.enrollment.findMany({
        where: { userId: user.id, endsAt: null },
        select: { levelId: true }
      })
    ]);
    const enrolledIds = new Set(enrollments.map((item) => item.levelId));

    return levels.map((level) => {
      const lessons = level.modules.flatMap((module) => module.lessons);
      const completedLessons = lessons.filter(
        (lesson) => lesson.progress[0]?.status === ProgressStatus.COMPLETED
      ).length;
      const inProgressLessons = lessons.filter(
        (lesson) => lesson.progress[0]?.status === ProgressStatus.IN_PROGRESS
      ).length;

      return {
        code: level.code,
        title: level.title,
        totalLessons: lessons.length,
        completedLessons,
        inProgressLessons,
        isUnlocked: level.orderIndex === 1 || enrolledIds.has(level.id),
        percent: lessons.length === 0
          ? 0
          : Math.round((completedLessons / lessons.length) * 100)
      };
    });
  }

  private async getNextLessons(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId, endsAt: null },
      select: { levelId: true }
    });
    const levelIds = enrollments.map((item) => item.levelId);
    const lessons = await this.prisma.lesson.findMany({
      orderBy: [
        { module: { level: { orderIndex: "asc" } } },
        { module: { orderIndex: "asc" } },
        { orderIndex: "asc" }
      ],
      take: 6,
      where: {
        module: { levelId: { in: levelIds } },
        progress: {
          none: {
            userId,
            status: ProgressStatus.COMPLETED
          }
        }
      },
      select: {
        slug: true,
        title: true,
        orderIndex: true,
        progress: {
          where: { userId },
          select: { status: true }
        },
        module: {
          select: {
            title: true,
            level: {
              select: {
                code: true,
                title: true
              }
            }
          }
        }
      }
    });

    return lessons.map((lesson) => ({
      slug: lesson.slug,
      title: lesson.title,
      levelCode: lesson.module.level.code,
      levelTitle: lesson.module.level.title,
      moduleTitle: lesson.module.title,
      orderIndex: lesson.orderIndex,
      status: lesson.progress[0]?.status ?? ProgressStatus.NOT_STARTED
    }));
  }

  private async ensureUser(user: ApiSessionUser) {
    await this.prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email,
        role: roleMap[user.role],
        profile: {
          create: {
            displayName: user.displayName
          }
        }
      },
      update: {
        email: user.email,
        role: roleMap[user.role],
        profile: {
          upsert: {
            create: {
              displayName: user.displayName
            },
            update: {
              displayName: user.displayName
            }
          }
        }
      }
    });
    const firstLevel = await this.prisma.courseLevel.findFirst({
      orderBy: { orderIndex: "asc" },
      select: { id: true }
    });

    if (firstLevel) {
      try {
        await this.prisma.enrollment.upsert({
          where: { userId_levelId: { userId: user.id, levelId: firstLevel.id } },
          create: { userId: user.id, levelId: firstLevel.id },
          update: {}
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
          throw error;
        }
      }
    }
  }

  private async unlockNextLevelIfEligible(userId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findUniqueOrThrow({
      where: { id: lessonId },
      select: {
        module: {
          select: {
            level: { select: { id: true, code: true, orderIndex: true } }
          }
        }
      }
    });
    const level = lesson.module.level;
    const [total, completed] = await Promise.all([
      this.prisma.lesson.count({ where: { module: { levelId: level.id } } }),
      this.prisma.lessonProgress.count({
        where: {
          userId,
          status: ProgressStatus.COMPLETED,
          lesson: { module: { levelId: level.id } }
        }
      })
    ]);

    if (!canUnlockLevel(level.code, completed, total)) return;
    const nextLevel = await this.prisma.courseLevel.findFirst({
      where: { orderIndex: { gt: level.orderIndex } },
      orderBy: { orderIndex: "asc" },
      select: { id: true }
    });

    if (nextLevel) {
      await this.prisma.enrollment.upsert({
        where: { userId_levelId: { userId, levelId: nextLevel.id } },
        create: { userId, levelId: nextLevel.id },
        update: {}
      });
    }
  }
}
