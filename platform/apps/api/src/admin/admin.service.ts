import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { LessonBlockType, Prisma } from "@prisma/client";
import { CoursesService } from "../courses/courses.service";
import { PrismaService } from "../prisma/prisma.service";

const lessonBlockTypes = Object.values(LessonBlockType);

export type AdminUpdateLessonPayload = {
  title?: unknown;
  summary?: unknown;
  blocks?: unknown;
};

export type AdminCreateDictionaryTermPayload = {
  term?: unknown;
  translation?: unknown;
  definition?: unknown;
  examples?: unknown;
};

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
        lessons: module.lessons,
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

  async getDictionary(query?: string) {
    const search = typeof query === "string" ? query.trim() : "";

    const terms = await this.prisma.dictionaryTerm.findMany({
      where: search
        ? {
            OR: [
              { term: { contains: search, mode: "insensitive" } },
              { translation: { contains: search, mode: "insensitive" } },
              { definition: { contains: search, mode: "insensitive" } }
            ]
          }
        : undefined,
      orderBy: { term: "asc" },
      take: 80
    });

    return {
      total: terms.length,
      terms: terms.map((term) => ({
        id: term.id,
        term: term.term,
        translation: term.translation,
        definition: term.definition,
        examples: term.examples
      }))
    };
  }

  async createDictionaryTerm(payload: AdminCreateDictionaryTermPayload) {
    const term = this.parseRequiredString(payload.term, "term", 120);
    const translation = this.parseOptionalString(payload.translation, "translation", 180);
    const definition = this.parseOptionalString(payload.definition, "definition", 600);
    const examples = this.parseStringList(payload.examples, "examples", 8);

    const savedTerm = await this.prisma.dictionaryTerm.create({
      data: {
        term,
        translation,
        definition,
        examples: examples.length > 0 ? examples : Prisma.JsonNull
      }
    });

    return {
      id: savedTerm.id,
      term: savedTerm.term,
      translation: savedTerm.translation,
      definition: savedTerm.definition,
      examples: savedTerm.examples
    };
  }

  async getLessonForEdit(slug: string) {
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
        }
      }
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson ${slug} not found`);
    }

    return {
      id: lesson.id,
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
        id: block.id,
        type: block.type,
        orderIndex: block.orderIndex,
        content: block.content
      }))
    };
  }

  async updateLesson(slug: string, payload: AdminUpdateLessonPayload) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson ${slug} not found`);
    }

    const title = this.parseTitle(payload.title);
    const summary = this.parseSummary(payload.summary);
    const blocks = this.parseBlocks(payload.blocks);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.lesson.update({
        where: { id: lesson.id },
        data: {
          title,
          summary
        }
      });

      if (blocks) {
        await transaction.lessonBlock.deleteMany({
          where: { lessonId: lesson.id }
        });

        await transaction.lessonBlock.createMany({
          data: blocks.map((block, index) => ({
            lessonId: lesson.id,
            type: block.type,
            orderIndex: index + 1,
            content: block.content
          }))
        });
      }
    });

    return this.getLessonForEdit(slug);
  }

  private parseTitle(value: unknown) {
    if (typeof value !== "string") {
      throw new BadRequestException("title must be a string");
    }

    const title = value.trim();

    if (!title || title.length > 180) {
      throw new BadRequestException("title must be between 1 and 180 characters");
    }

    return title;
  }

  private parseRequiredString(value: unknown, field: string, maxLength: number) {
    if (typeof value !== "string") {
      throw new BadRequestException(`${field} must be a string`);
    }

    const text = value.trim();

    if (!text || text.length > maxLength) {
      throw new BadRequestException(`${field} must be between 1 and ${maxLength} characters`);
    }

    return text;
  }

  private parseOptionalString(value: unknown, field: string, maxLength: number) {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value !== "string") {
      throw new BadRequestException(`${field} must be a string or null`);
    }

    const text = value.trim();

    if (text.length > maxLength) {
      throw new BadRequestException(`${field} must be ${maxLength} characters or less`);
    }

    return text.length > 0 ? text : null;
  }

  private parseStringList(value: unknown, field: string, maxItems: number) {
    if (value === null || value === undefined) {
      return [];
    }

    if (!Array.isArray(value)) {
      throw new BadRequestException(`${field} must be an array`);
    }

    if (value.length > maxItems) {
      throw new BadRequestException(`${field} must contain ${maxItems} items or fewer`);
    }

    return value.map((item, index) => {
      if (typeof item !== "string") {
        throw new BadRequestException(`${field}[${index}] must be a string`);
      }

      return item.trim();
    }).filter(Boolean);
  }

  private parseSummary(value: unknown) {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value !== "string") {
      throw new BadRequestException("summary must be a string or null");
    }

    const summary = value.trim();

    return summary.length > 0 ? summary : null;
  }

  private parseBlocks(value: unknown) {
    if (value === undefined) {
      return null;
    }

    if (!Array.isArray(value)) {
      throw new BadRequestException("blocks must be an array");
    }

    if (value.length === 0 || value.length > 20) {
      throw new BadRequestException("blocks must contain 1 to 20 items");
    }

    return value.map((rawBlock, index) => {
      if (!this.isRecord(rawBlock)) {
        throw new BadRequestException(`blocks[${index}] must be an object`);
      }

      if (!lessonBlockTypes.includes(rawBlock.type as LessonBlockType)) {
        throw new BadRequestException(`blocks[${index}].type is invalid`);
      }

      if (!this.isJsonObject(rawBlock.content)) {
        throw new BadRequestException(`blocks[${index}].content must be a JSON object`);
      }

      return {
        type: rawBlock.type as LessonBlockType,
        content: rawBlock.content as Prisma.InputJsonObject
      };
    });
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private isJsonObject(value: unknown): value is Prisma.InputJsonObject {
    if (!this.isRecord(value)) {
      return false;
    }

    try {
      JSON.stringify(value);
      return true;
    } catch {
      return false;
    }
  }
}
