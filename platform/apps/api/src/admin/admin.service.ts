import { Inject, Injectable } from "@nestjs/common";
import { CoursesService } from "../courses/courses.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminService {
  constructor(
    @Inject(CoursesService) private readonly coursesService: CoursesService,
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  async getOverview() {
    const courseInventory = await this.coursesService.getLevels();

    return {
      metrics: [
        {
          label: "Legacy course items",
          value: String(courseInventory.totalLessons),
          tone: "neutral"
        },
        {
          label: "Native lessons",
          value: courseInventory.source === "database" ? String(courseInventory.totalLessons) : "0",
          tone: courseInventory.source === "database" ? "good" : "warning"
        },
        {
          label: "Active roles",
          value: "4",
          tone: "good"
        }
      ],
      nativeMigrationPercent: courseInventory.source === "database" ? 100 : 0,
      riskSignals: [
        {
          label: "Shared-account signals",
          count: 0,
          tone: "neutral"
        },
        {
          label: "Toxic messages",
          count: 0,
          tone: "neutral"
        }
      ]
    };
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
        orderIndex: module.orderIndex,
        lessonCount: module.lessons.length,
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
}
