import { Inject, Injectable, NotFoundException } from "@nestjs/common";
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
