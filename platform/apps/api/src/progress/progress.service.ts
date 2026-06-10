import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ProgressStatus, UserRole } from "@prisma/client";
import type { ApiRole, ApiSessionUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";

const roleMap: Record<ApiRole, UserRole> = {
  student: UserRole.STUDENT,
  teacher: UserRole.TEACHER,
  admin: UserRole.ADMIN,
  owner: UserRole.OWNER
};

@Injectable()
export class ProgressService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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

    const currentLevel = levelProgress.find((level) => level.completedLessons < level.totalLessons)
      ?? levelProgress[levelProgress.length - 1]
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

    return this.getLessonProgressResponse(user.id, lesson.slug);
  }

  private async prepareProgressUpdate(user: ApiSessionUser, slug: string) {
    await this.ensureUser(user);

    const lesson = await this.prisma.lesson.findUnique({
      where: { slug },
      select: { id: true, slug: true }
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson ${slug} not found`);
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
    const levels = await this.prisma.courseLevel.findMany({
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
    });

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
        percent: lessons.length === 0
          ? 0
          : Math.round((completedLessons / lessons.length) * 100)
      };
    });
  }

  private async getNextLessons(userId: string) {
    const lessons = await this.prisma.lesson.findMany({
      orderBy: [
        { module: { level: { orderIndex: "asc" } } },
        { module: { orderIndex: "asc" } },
        { orderIndex: "asc" }
      ],
      take: 6,
      where: {
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
  }
}
