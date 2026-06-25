import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { ApiSessionUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";

export type QuickSavePayload = {
  term?: unknown;
  translation?: unknown;
  definition?: unknown;
  lessonSlug?: unknown;
};

@Injectable()
export class DictionaryService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getDictionary(user: ApiSessionUser, query?: string, mine = false) {
    const search = typeof query === "string" ? query.trim() : "";
    const terms = await this.prisma.dictionaryTerm.findMany({
      where: {
        ...(mine ? { users: { some: { userId: user.id } } } : {}),
        ...(search
          ? {
              OR: [
                { term: { contains: search, mode: "insensitive" as const } },
                { translation: { contains: search, mode: "insensitive" as const } },
                { definition: { contains: search, mode: "insensitive" as const } }
              ]
            }
          : {})
      },
      include: {
        users: {
          where: { userId: user.id },
          select: { savedAt: true }
        }
      },
      orderBy: { term: "asc" },
      take: 200
    });

    return {
      total: terms.length,
      terms: terms.map((term) => ({
        id: term.id,
        term: term.term,
        translation: term.translation,
        definition: term.definition,
        examples: term.examples,
        saved: term.users.length > 0,
        savedAt: term.users[0]?.savedAt ?? null
      }))
    };
  }

  async quickSave(user: ApiSessionUser, payload: QuickSavePayload) {
    const termText = this.requiredText(payload.term, "term", 80);
    const translation = this.optionalText(payload.translation, "translation", 180);
    const definition = this.optionalText(payload.definition, "definition", 600);
    const lessonSlug = this.optionalText(payload.lessonSlug, "lessonSlug", 160);

    let term = await this.prisma.dictionaryTerm.findFirst({
      where: {
        term: {
          equals: termText,
          mode: "insensitive"
        }
      }
    });

    if (!term) {
      term = await this.prisma.dictionaryTerm.create({
        data: {
          term: termText,
          translation,
          definition,
          examples: Prisma.JsonNull
        }
      });
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.userDictionaryTerm.upsert({
        where: {
          userId_termId: {
            userId: user.id,
            termId: term.id
          }
        },
        create: {
          userId: user.id,
          termId: term.id
        },
        update: {
          savedAt: new Date()
        }
      });

      if (lessonSlug) {
        const lesson = await transaction.lesson.findUnique({
          where: { slug: lessonSlug },
          select: { id: true }
        });

        if (lesson) {
          await transaction.lessonDictionaryTerm.upsert({
            where: {
              lessonId_termId: {
                lessonId: lesson.id,
                termId: term.id
              }
            },
            create: {
              lessonId: lesson.id,
              termId: term.id
            },
            update: {}
          });
        }
      }

      await transaction.activityEvent.create({
        data: {
          userId: user.id,
          type: "DICTIONARY_TERM_SAVED",
          metadata: {
            termId: term.id,
            term: term.term,
            lessonSlug: lessonSlug ?? null
          }
        }
      });
    });

    return {
      id: term.id,
      term: term.term,
      translation: term.translation,
      definition: term.definition,
      saved: true
    };
  }

  async saveTerm(user: ApiSessionUser, termId: string) {
    const term = await this.prisma.dictionaryTerm.findUnique({
      where: { id: termId }
    });

    if (!term) {
      throw new NotFoundException("Dictionary term not found");
    }

    await this.prisma.userDictionaryTerm.upsert({
      where: {
        userId_termId: {
          userId: user.id,
          termId
        }
      },
      create: { userId: user.id, termId },
      update: { savedAt: new Date() }
    });

    return { termId, saved: true };
  }

  async removeTerm(user: ApiSessionUser, termId: string) {
    await this.prisma.userDictionaryTerm.deleteMany({
      where: { userId: user.id, termId }
    });

    return { termId, saved: false };
  }

  private requiredText(value: unknown, field: string, maxLength: number) {
    if (typeof value !== "string") {
      throw new BadRequestException(`${field} must be a string`);
    }

    const text = value.trim();

    if (!text || text.length > maxLength) {
      throw new BadRequestException(`${field} must be between 1 and ${maxLength} characters`);
    }

    return text;
  }

  private optionalText(value: unknown, field: string, maxLength: number) {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    return this.requiredText(value, field, maxLength);
  }
}
