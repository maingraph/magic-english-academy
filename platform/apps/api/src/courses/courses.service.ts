import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ProgressStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { courseLevels } from "./course-seed";

@Injectable()
export class CoursesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getLevels() {
    const databaseLevels = await this.getDatabaseLevels();

    if (databaseLevels.length > 0) {
      return {
        source: "database",
        totalLessons: databaseLevels.reduce((sum, level) => sum + level.lessonCount, 0),
        levels: databaseLevels
      };
    }

    return {
      source: "legacy-static-audit",
      totalLessons: courseLevels.reduce((sum, level) => sum + level.lessonCount, 0),
      levels: courseLevels
    };
  }

  async getLevel(code: string) {
    const databaseLevels = await this.getDatabaseLevels();
    const level = databaseLevels.find(
      (courseLevel) => courseLevel.code.toLowerCase() === code.toLowerCase()
    ) ?? courseLevels.find(
      (courseLevel) => courseLevel.code.toLowerCase() === code.toLowerCase()
    );

    if (!level) {
      throw new NotFoundException(`Course level ${code} not found`);
    }

    return level;
  }

  async getLevelLessons(code: string, userId?: string) {
    const level = await this.prisma.courseLevel.findFirst({
      where: { code: { equals: code, mode: "insensitive" } },
      include: {
        modules: {
          orderBy: { orderIndex: "asc" },
          include: {
            lessons: {
              orderBy: { orderIndex: "asc" },
              select: {
                slug: true,
                title: true,
                summary: true,
                orderIndex: true,
                progress: {
                  where: { userId: userId ?? "__anonymous__" },
                  select: { status: true }
                }
              }
            }
          }
        }
      }
    });

    if (!level) {
      throw new NotFoundException(`Course level ${code} not found`);
    }

    return {
      code: level.code,
      title: level.title,
      lessonCount: level.modules.reduce(
        (sum, module) => sum + module.lessons.length,
        0
      ),
      modules: level.modules.map((module) => ({
        title: module.title,
        orderIndex: module.orderIndex,
        lessons: module.lessons.map((lesson) => ({
          slug: lesson.slug,
          title: lesson.title,
          summary: lesson.summary,
          orderIndex: lesson.orderIndex,
          status: lesson.progress[0]?.status ?? ProgressStatus.NOT_STARTED
        }))
      }))
    };
  }

  async getLesson(slug: string, userId?: string) {
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
        },
        progress: {
          where: { userId: userId ?? "__anonymous__" },
          select: {
            status: true,
            completedAt: true,
            updatedAt: true
          }
        }
      }
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson ${slug} not found`);
    }

    return {
      slug: lesson.slug,
      title: lesson.title,
      summary: lesson.summary,
      orderIndex: lesson.orderIndex,
      level: {
        code: lesson.module.level.code,
        title: lesson.module.level.title
      },
      module: {
        title: lesson.module.title,
        orderIndex: lesson.module.orderIndex
      },
      blocks: lesson.blocks.map((block) => ({
        type: block.type,
        orderIndex: block.orderIndex,
        content: block.content
      })),
      progress: {
        status: lesson.progress[0]?.status ?? ProgressStatus.NOT_STARTED,
        completedAt: lesson.progress[0]?.completedAt ?? null,
        updatedAt: lesson.progress[0]?.updatedAt ?? null
      }
    };
  }

  private async getDatabaseLevels() {
    try {
      const levels = await this.prisma.courseLevel.findMany({
        orderBy: { orderIndex: "asc" },
        include: {
          modules: {
            orderBy: { orderIndex: "asc" },
            include: {
              lessons: {
                orderBy: { orderIndex: "asc" },
                select: {
                  title: true
                }
              }
            }
          }
        }
      });

      return levels.map((level) => {
        const lessons = level.modules.flatMap((module) => module.lessons);

        return {
          code: level.code,
          title: level.title,
          lessonCount: lessons.length,
          status: "native-seeded",
          sampleTopics: lessons.slice(0, 4).map((lesson) => lesson.title)
        };
      });
    } catch {
      return [];
    }
  }
}
