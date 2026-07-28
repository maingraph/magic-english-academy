import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createReadStream } from "node:fs";
import { access, mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

export type UploadedFeedFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

const allowedMimeTypes = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/webp",
  "audio/mpeg",
  "audio/ogg",
  "video/mp4",
  "video/webm"
]);

@Injectable()
export class FeedStorageService {
  private readonly uploadRoot = resolve(
    process.env.FEED_UPLOAD_DIR ?? resolve(process.cwd(), "uploads/feed")
  );

  async store(file: UploadedFeedFile) {
    if (!file?.buffer || file.size < 1 || file.size > 10 * 1024 * 1024) {
      throw new BadRequestException("Файл должен быть размером от 1 байта до 10 МБ");
    }
    if (!allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException("Этот тип файла не поддерживается");
    }

    await mkdir(this.uploadRoot, { recursive: true });
    const extension = extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, "");
    const storageKey = `${randomUUID()}${extension.slice(0, 10)}`;
    await writeFile(resolve(this.uploadRoot, storageKey), file.buffer, { flag: "wx" });

    return {
      name: basename(file.originalname).slice(0, 180),
      mimeType: file.mimetype,
      size: file.size,
      storageKey,
      url: `/api/feed/files/${storageKey}`
    };
  }

  async exists(storageKey: string) {
    try {
      await access(this.resolveKey(storageKey));
      return true;
    } catch {
      return false;
    }
  }

  async open(storageKey: string) {
    const path = this.resolveKey(storageKey);
    try {
      await access(path);
    } catch {
      throw new NotFoundException("Файл не найден");
    }
    return createReadStream(path);
  }

  async remove(storageKey: string) {
    try {
      await unlink(this.resolveKey(storageKey));
    } catch (error) {
      if (
        !error ||
        typeof error !== "object" ||
        !("code" in error) ||
        error.code !== "ENOENT"
      ) {
        throw error;
      }
    }
  }

  private resolveKey(storageKey: string) {
    if (!/^[a-f0-9-]{36}(?:\.[a-z0-9]{1,9})?$/.test(storageKey)) {
      throw new BadRequestException("Некорректный ключ файла");
    }
    return resolve(this.uploadRoot, storageKey);
  }
}
