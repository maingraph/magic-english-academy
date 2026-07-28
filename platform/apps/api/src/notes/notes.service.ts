import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { NoteColor } from "@prisma/client";
import type { ApiSessionUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";

export type CreateNotePayload = {
  title?: unknown;
  text?: unknown;
  color?: unknown;
  isPinned?: unknown;
  lessonSlug?: unknown;
};

export type UpdateNotePayload = Partial<CreateNotePayload>;

export type ReorderNotesPayload = {
  ids?: unknown;
};

@Injectable()
export class NotesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(user: ApiSessionUser, query?: string) {
    const q = typeof query === "string" ? query.trim().slice(0, 120) : "";
    const notes = await this.prisma.userNote.findMany({
      where: {
        userId: user.id,
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" as const } },
                { text: { contains: q, mode: "insensitive" as const } }
              ]
            }
          : {})
      },
      orderBy: [{ position: "asc" }, { updatedAt: "desc" }],
      include: {
        lesson: {
          select: { slug: true, title: true }
        }
      }
    });

    return { notes: notes.map((note) => this.serialize(note)) };
  }

  async create(user: ApiSessionUser, payload: CreateNotePayload) {
    const lessonId = await this.resolveLessonId(payload.lessonSlug);
    const maximum = await this.prisma.userNote.aggregate({
      where: { userId: user.id },
      _max: { position: true }
    });
    const note = await this.prisma.userNote.create({
      data: {
        userId: user.id,
        lessonId,
        title: this.requiredText(payload.title, "title", 160),
        text: this.requiredText(payload.text, "text", 8_000),
        color: this.parseColor(payload.color),
        isPinned: this.optionalBoolean(payload.isPinned) ?? false,
        position: (maximum._max.position ?? -1) + 1
      },
      include: {
        lesson: { select: { slug: true, title: true } }
      }
    });

    return this.serialize(note);
  }

  async update(user: ApiSessionUser, noteId: string, payload: UpdateNotePayload) {
    await this.assertOwnership(user.id, noteId);
    const lessonId =
      payload.lessonSlug === undefined
        ? undefined
        : await this.resolveLessonId(payload.lessonSlug);
    const note = await this.prisma.userNote.update({
      where: { id: noteId },
      data: {
        ...(payload.title !== undefined
          ? { title: this.requiredText(payload.title, "title", 160) }
          : {}),
        ...(payload.text !== undefined
          ? { text: this.requiredText(payload.text, "text", 8_000) }
          : {}),
        ...(payload.color !== undefined ? { color: this.parseColor(payload.color) } : {}),
        ...(payload.isPinned !== undefined
          ? { isPinned: this.optionalBoolean(payload.isPinned) }
          : {}),
        ...(lessonId !== undefined ? { lessonId } : {})
      },
      include: {
        lesson: { select: { slug: true, title: true } }
      }
    });

    return this.serialize(note);
  }

  async remove(user: ApiSessionUser, noteId: string) {
    await this.assertOwnership(user.id, noteId);
    await this.prisma.userNote.delete({ where: { id: noteId } });
    return { removed: true };
  }

  async reorder(user: ApiSessionUser, payload: ReorderNotesPayload) {
    if (
      !Array.isArray(payload.ids) ||
      payload.ids.length > 500 ||
      payload.ids.some((id) => typeof id !== "string")
    ) {
      throw new BadRequestException("ids must be an array of note identifiers");
    }

    const ids = Array.from(new Set(payload.ids as string[]));
    const owned = await this.prisma.userNote.findMany({
      where: { userId: user.id, id: { in: ids } },
      select: { id: true }
    });
    if (owned.length !== ids.length) {
      throw new BadRequestException("One or more notes do not belong to current user");
    }

    await this.prisma.$transaction(
      ids.map((id, position) =>
        this.prisma.userNote.update({
          where: { id },
          data: { position }
        })
      )
    );

    return { reordered: true, ids };
  }

  private async assertOwnership(userId: string, noteId: string) {
    const note = await this.prisma.userNote.findFirst({
      where: { id: noteId, userId },
      select: { id: true }
    });
    if (!note) throw new NotFoundException("Заметка не найдена");
  }

  private async resolveLessonId(value: unknown) {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value !== "string" || value.length > 180) {
      throw new BadRequestException("lessonSlug must be a string");
    }
    const lesson = await this.prisma.lesson.findUnique({
      where: { slug: value.trim() },
      select: { id: true }
    });
    if (!lesson) throw new BadRequestException("Урок не найден");
    return lesson.id;
  }

  private requiredText(value: unknown, field: string, maxLength: number) {
    if (typeof value !== "string") {
      throw new BadRequestException(`${field} must be a string`);
    }
    const text = value.trim();
    if (!text || text.length > maxLength) {
      throw new BadRequestException(`${field} must contain 1 to ${maxLength} characters`);
    }
    return text;
  }

  private parseColor(value: unknown): NoteColor {
    if (value === undefined) return "CREAM";
    if (
      typeof value !== "string" ||
      !["CREAM", "WHITE", "ORANGE"].includes(value.toUpperCase())
    ) {
      throw new BadRequestException("color must be CREAM, WHITE or ORANGE");
    }
    return value.toUpperCase() as NoteColor;
  }

  private optionalBoolean(value: unknown) {
    if (value === undefined) return undefined;
    if (typeof value !== "boolean") {
      throw new BadRequestException("Expected boolean value");
    }
    return value;
  }

  private serialize(note: {
    id: string;
    title: string;
    text: string;
    color: NoteColor;
    isPinned: boolean;
    position: number;
    createdAt: Date;
    updatedAt: Date;
    lesson: { slug: string; title: string } | null;
  }) {
    return {
      id: note.id,
      title: note.title,
      text: note.text,
      color: note.color.toLowerCase(),
      pinned: note.isPinned,
      position: note.position,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      lesson: note.lesson
    };
  }
}
