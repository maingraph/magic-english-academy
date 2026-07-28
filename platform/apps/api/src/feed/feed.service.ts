import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { FeedPostStatus, Prisma } from "@prisma/client";
import type { ApiSessionUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { FeedStorageService } from "./feed-storage.service";

export type FeedAttachmentPayload = {
  name?: unknown;
  mimeType?: unknown;
  size?: unknown;
  storageKey?: unknown;
  url?: unknown;
};

export type CreateFeedPostPayload = {
  title?: unknown;
  text?: unknown;
  status?: unknown;
  isPinned?: unknown;
  scheduledAt?: unknown;
  attachments?: unknown;
};

export type UpdateFeedPostPayload = Partial<CreateFeedPostPayload>;

export type FeedCommentPayload = {
  text?: unknown;
};

const postInclude = (userId: string) =>
  ({
    author: {
      select: {
        id: true,
        role: true,
        profile: { select: { displayName: true, avatarUrl: true } }
      }
    },
    attachments: { orderBy: { createdAt: "asc" } },
    comments: {
      orderBy: { createdAt: "asc" },
      take: 50,
      include: {
        author: {
          select: {
            id: true,
            role: true,
            profile: { select: { displayName: true, avatarUrl: true } }
          }
        }
      }
    },
    likes: { where: { userId }, select: { userId: true } },
    bookmarks: { where: { userId }, select: { userId: true } },
    _count: { select: { likes: true, comments: true, views: true } }
  }) satisfies Prisma.FeedPostInclude;

export function canManageFeedPost(
  role: ApiSessionUser["role"],
  userId: string,
  authorId: string
) {
  if (role === "student") return false;
  if (role === "teacher") return userId === authorId;
  return true;
}

@Injectable()
export class FeedService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(FeedStorageService) private readonly storage: FeedStorageService
  ) {}

  async list(user: ApiSessionUser, cursor?: string) {
    const now = new Date();
    const posts = await this.prisma.feedPost.findMany({
      where: {
        status: "PUBLISHED",
        OR: [{ publishedAt: null }, { publishedAt: { lte: now } }]
      },
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
      take: 21,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: postInclude(user.id)
    });
    const hasMore = posts.length > 20;
    const page = posts.slice(0, 20);
    return {
      posts: page.map((post) => this.serialize(post)),
      nextCursor: hasMore ? page.at(-1)?.id ?? null : null,
      permissions: {
        canPublish: user.role !== "student",
        canModerate: ["teacher", "admin", "owner"].includes(user.role)
      }
    };
  }

  async create(user: ApiSessionUser, payload: CreateFeedPostPayload) {
    const status = this.parseStatus(payload.status);
    const scheduledAt = this.optionalDate(payload.scheduledAt);
    const attachments = await this.parseAttachments(payload.attachments);
    const post = await this.prisma.feedPost.create({
      data: {
        authorId: user.id,
        title: this.requiredText(payload.title, "title", 180),
        text: this.requiredText(payload.text, "text", 12_000),
        status,
        isPinned: this.optionalBoolean(payload.isPinned) ?? false,
        scheduledAt,
        publishedAt: status === "PUBLISHED" ? scheduledAt ?? new Date() : null,
        attachments: attachments.length ? { create: attachments } : undefined
      },
      include: postInclude(user.id)
    });
    return this.serialize(post);
  }

  async update(
    user: ApiSessionUser,
    postId: string,
    payload: UpdateFeedPostPayload
  ) {
    const existing = await this.getManageablePost(user, postId);
    const status =
      payload.status === undefined ? undefined : this.parseStatus(payload.status);
    const scheduledAt =
      payload.scheduledAt === undefined ? undefined : this.optionalDate(payload.scheduledAt);
    const post = await this.prisma.feedPost.update({
      where: { id: postId },
      data: {
        ...(payload.title !== undefined
          ? { title: this.requiredText(payload.title, "title", 180) }
          : {}),
        ...(payload.text !== undefined
          ? { text: this.requiredText(payload.text, "text", 12_000) }
          : {}),
        ...(status ? { status } : {}),
        ...(payload.isPinned !== undefined
          ? { isPinned: this.optionalBoolean(payload.isPinned) }
          : {}),
        ...(scheduledAt !== undefined ? { scheduledAt } : {}),
        ...(status === "PUBLISHED" && existing.status !== "PUBLISHED"
          ? { publishedAt: scheduledAt ?? new Date() }
          : {})
      },
      include: postInclude(user.id)
    });
    return this.serialize(post);
  }

  async remove(user: ApiSessionUser, postId: string) {
    await this.getManageablePost(user, postId);
    const attachments = await this.prisma.feedAttachment.findMany({
      where: { postId },
      select: { storageKey: true }
    });
    await this.prisma.feedPost.delete({ where: { id: postId } });
    await Promise.allSettled(
      attachments.map((attachment) => this.storage.remove(attachment.storageKey))
    );
    return { removed: true };
  }

  async openAttachment(user: ApiSessionUser, storageKey: string) {
    const attachment = await this.prisma.feedAttachment.findUnique({
      where: { storageKey },
      select: {
        name: true,
        mimeType: true,
        post: {
          select: { status: true, authorId: true }
        }
      }
    });
    if (!attachment) throw new NotFoundException("Файл не найден");
    if (
      attachment.post.status !== "PUBLISHED" &&
      !canManageFeedPost(user.role, user.id, attachment.post.authorId)
    ) {
      throw new NotFoundException("Файл не найден");
    }

    return {
      stream: await this.storage.open(storageKey),
      name: attachment.name,
      mimeType: attachment.mimeType
    };
  }

  async toggleLike(user: ApiSessionUser, postId: string) {
    await this.assertPublished(postId);
    const key = { postId_userId: { postId, userId: user.id } };
    const existing = await this.prisma.feedLike.findUnique({ where: key });
    if (existing) await this.prisma.feedLike.delete({ where: key });
    else await this.prisma.feedLike.create({ data: { postId, userId: user.id } });
    return {
      liked: !existing,
      count: await this.prisma.feedLike.count({ where: { postId } })
    };
  }

  async toggleBookmark(user: ApiSessionUser, postId: string) {
    await this.assertPublished(postId);
    const key = { postId_userId: { postId, userId: user.id } };
    const existing = await this.prisma.feedBookmark.findUnique({ where: key });
    if (existing) await this.prisma.feedBookmark.delete({ where: key });
    else await this.prisma.feedBookmark.create({ data: { postId, userId: user.id } });
    return { saved: !existing };
  }

  async recordView(user: ApiSessionUser, postId: string) {
    await this.assertPublished(postId);
    await this.prisma.feedView.upsert({
      where: { postId_userId: { postId, userId: user.id } },
      create: { postId, userId: user.id },
      update: {}
    });
    return {
      viewed: true,
      count: await this.prisma.feedView.count({ where: { postId } })
    };
  }

  async addComment(user: ApiSessionUser, postId: string, payload: FeedCommentPayload) {
    await this.assertPublished(postId);
    const comment = await this.prisma.feedComment.create({
      data: {
        postId,
        authorId: user.id,
        text: this.requiredText(payload.text, "text", 2_000)
      },
      include: {
        author: {
          select: {
            id: true,
            role: true,
            profile: { select: { displayName: true, avatarUrl: true } }
          }
        }
      }
    });
    return this.serializeComment(comment);
  }

  async removeComment(user: ApiSessionUser, commentId: string) {
    const comment = await this.prisma.feedComment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true }
    });
    if (!comment) throw new NotFoundException("Комментарий не найден");
    if (comment.authorId !== user.id && user.role === "student") {
      throw new ForbiddenException("Недостаточно прав для удаления комментария");
    }
    await this.prisma.feedComment.delete({ where: { id: commentId } });
    return { removed: true };
  }

  private async getManageablePost(user: ApiSessionUser, postId: string) {
    const post = await this.prisma.feedPost.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, status: true }
    });
    if (!post) throw new NotFoundException("Публикация не найдена");
    if (!canManageFeedPost(user.role, user.id, post.authorId)) {
      throw new ForbiddenException("Преподаватель может изменять только свои публикации");
    }
    return post;
  }

  private async assertPublished(postId: string) {
    const post = await this.prisma.feedPost.findFirst({
      where: { id: postId, status: "PUBLISHED" },
      select: { id: true }
    });
    if (!post) throw new NotFoundException("Публикация не найдена");
  }

  private parseStatus(value: unknown): FeedPostStatus {
    if (value === undefined) return "PUBLISHED";
    if (
      typeof value !== "string" ||
      !["DRAFT", "PUBLISHED", "ARCHIVED"].includes(value.toUpperCase())
    ) {
      throw new BadRequestException("status must be DRAFT, PUBLISHED or ARCHIVED");
    }
    return value.toUpperCase() as FeedPostStatus;
  }

  private async parseAttachments(value: unknown) {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > 8) {
      throw new BadRequestException("attachments must contain at most 8 files");
    }
    const parsed = value.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        throw new BadRequestException("Invalid attachment");
      }
      const attachment = item as FeedAttachmentPayload;
      return {
        name: this.requiredText(attachment.name, "attachment.name", 180),
        mimeType: this.requiredText(attachment.mimeType, "attachment.mimeType", 120),
        size: this.requiredInteger(attachment.size, "attachment.size", 10 * 1024 * 1024),
        storageKey: this.requiredText(attachment.storageKey, "attachment.storageKey", 80),
        url: this.requiredText(attachment.url, "attachment.url", 500)
      };
    });
    const availability = await Promise.all(
      parsed.map((attachment) => this.storage.exists(attachment.storageKey))
    );
    if (availability.some((available) => !available)) {
      throw new BadRequestException("Один или несколько файлов не найдены");
    }
    return parsed;
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

  private requiredInteger(value: unknown, field: string, maximum: number) {
    if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > maximum) {
      throw new BadRequestException(`${field} must be a valid integer`);
    }
    return Number(value);
  }

  private optionalBoolean(value: unknown) {
    if (value === undefined) return undefined;
    if (typeof value !== "boolean") throw new BadRequestException("Expected boolean value");
    return value;
  }

  private optionalDate(value: unknown) {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value !== "string") throw new BadRequestException("scheduledAt must be a date");
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException("scheduledAt is invalid");
    return date;
  }

  private serialize(post: Prisma.FeedPostGetPayload<{ include: ReturnType<typeof postInclude> }>) {
    return {
      id: post.id,
      title: post.title,
      text: post.text,
      status: post.status.toLowerCase(),
      pinned: post.isPinned,
      publishedAt: post.publishedAt,
      scheduledAt: post.scheduledAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: {
        id: post.author.id,
        name: post.author.profile?.displayName ?? "Magic English",
        avatarUrl: post.author.profile?.avatarUrl ?? null,
        role: post.author.role.toLowerCase()
      },
      attachments: post.attachments,
      comments: post.comments.map((comment) => this.serializeComment(comment)),
      liked: post.likes.length > 0,
      saved: post.bookmarks.length > 0,
      counts: post._count
    };
  }

  private serializeComment(comment: {
    id: string;
    text: string;
    createdAt: Date;
    updatedAt: Date;
    author: {
      id: string;
      role: string;
      profile: { displayName: string; avatarUrl: string | null } | null;
    };
  }) {
    return {
      id: comment.id,
      text: comment.text,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: {
        id: comment.author.id,
        name: comment.author.profile?.displayName ?? "Ученик",
        avatarUrl: comment.author.profile?.avatarUrl ?? null,
        role: comment.author.role.toLowerCase()
      }
    };
  }
}
