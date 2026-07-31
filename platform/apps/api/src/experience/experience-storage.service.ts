import { BadRequestException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { del, issueSignedToken, presignUrl } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import type { ApiSessionUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";

type Payload = Record<string, unknown>;

const allowedTypes = new Set([
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
export class ExperienceStorageService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createUploadToken(user: ApiSessionUser, payload: Payload) {
    const name = this.text(payload.name, "name", 180);
    const mimeType = this.text(payload.mimeType, "mimeType", 100);
    const size = this.integer(payload.size, "size", 1, this.maximumSize(mimeType));
    if (!allowedTypes.has(mimeType)) throw new BadRequestException("Unsupported file type");
    if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL_OIDC_TOKEN) {
      return { mode: "local", reason: "Blob storage is not configured" };
    }

    const extension = extname(name).toLowerCase().replace(/[^a-z0-9.]/g, "").slice(0, 10);
    const pathname = `users/${user.id}/${randomUUID()}${extension}`;
    const validUntil = Date.now() + 15 * 60 * 1000;
    const signedToken = await issueSignedToken({
      pathname,
      operations: ["put"],
      validUntil,
      allowedContentTypes: [mimeType],
      maximumSizeInBytes: size
    });
    const { presignedUrl } = await presignUrl(signedToken, {
      access: "private",
      operation: "put",
      pathname,
      validUntil,
      allowedContentTypes: [mimeType],
      maximumSizeInBytes: size,
      addRandomSuffix: false,
      allowOverwrite: false
    });
    return { mode: "vercel-blob", pathname, presignedUrl, validUntil };
  }

  async finalize(user: ApiSessionUser, payload: Payload) {
    const pathname = this.text(payload.pathname, "pathname", 500);
    const expectedPrefix = `users/${user.id}/`;
    if (!pathname.startsWith(expectedPrefix) || pathname.includes("..")) {
      throw new BadRequestException("Invalid asset path");
    }
    const name = this.text(payload.name, "name", 180);
    const mimeType = this.text(payload.mimeType, "mimeType", 100);
    const size = this.integer(payload.size, "size", 1, this.maximumSize(mimeType));
    const url = this.url(payload.url, "url");
    if (!allowedTypes.has(mimeType)) throw new BadRequestException("Unsupported file type");

    return this.prisma.storageAsset.upsert({
      where: { pathname },
      create: {
        ownerId: user.id,
        provider: "VERCEL_BLOB",
        pathname,
        url,
        name,
        mimeType,
        size
      },
      update: { name, mimeType, size, url }
    });
  }

  async download(user: ApiSessionUser, assetId: string) {
    const asset = await this.prisma.storageAsset.findUnique({
      where: { id: assetId },
      include: { materials: { select: { status: true } } }
    });
    const canRead = asset && (
      asset.ownerId === user.id ||
      ["admin", "owner"].includes(user.role) ||
      asset.materials.some((material) => material.status === "PUBLISHED")
    );
    if (!asset || !canRead) throw new NotFoundException("Asset not found");
    if (asset.provider === "LOCAL") return { url: asset.url, expiresAt: null };
    if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL_OIDC_TOKEN) {
      throw new ServiceUnavailableException("Blob storage is not configured");
    }
    const validUntil = Date.now() + 10 * 60 * 1000;
    const signedToken = await issueSignedToken({
      pathname: asset.pathname,
      operations: ["get"],
      validUntil
    });
    const { presignedUrl } = await presignUrl(signedToken, {
      access: "private",
      operation: "get",
      pathname: asset.pathname,
      validUntil
    });
    return { url: presignedUrl, expiresAt: new Date(validUntil) };
  }

  async remove(user: ApiSessionUser, assetId: string) {
    const asset = await this.prisma.storageAsset.findUnique({ where: { id: assetId } });
    if (!asset || (asset.ownerId !== user.id && !["admin", "owner"].includes(user.role))) {
      throw new NotFoundException("Asset not found");
    }
    if (asset.provider === "VERCEL_BLOB") {
      if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL_OIDC_TOKEN) {
        throw new ServiceUnavailableException("Blob storage is not configured");
      }
      await del(asset.url);
    }
    await this.prisma.storageAsset.delete({ where: { id: asset.id } });
    return { deleted: true };
  }

  private maximumSize(mimeType: string) {
    return mimeType.startsWith("video/") ? 250 * 1024 * 1024 : 25 * 1024 * 1024;
  }

  private text(value: unknown, field: string, max: number) {
    if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
      throw new BadRequestException(`${field} is invalid`);
    }
    return value.trim();
  }

  private integer(value: unknown, field: string, min: number, max: number) {
    const number = typeof value === "number" ? value : Number(value);
    if (!Number.isInteger(number) || number < min || number > max) {
      throw new BadRequestException(`${field} is invalid`);
    }
    return number;
  }

  private url(value: unknown, field: string) {
    const text = this.text(value, field, 2_000);
    try {
      const url = new URL(text);
      if (url.protocol !== "https:") throw new Error("Protocol");
      return url.toString();
    } catch {
      throw new BadRequestException(`${field} is invalid`);
    }
  }
}
