import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { ApiRole, ApiSessionUser, RequestWithUser } from "./auth.types";
import { hashPassword, verifyPassword } from "./password";

const cookieName = "magic_session";
const sessionTtlSeconds = 60 * 60 * 24 * 7;

type TokenPayload = {
  sub: string;
  exp: number;
};

export type AuthPayload = {
  email?: unknown;
  password?: unknown;
  displayName?: unknown;
};

export type PasswordResetRequestPayload = {
  email?: unknown;
};

export type PasswordResetPayload = {
  token?: unknown;
  password?: unknown;
};

export type RequestMetadata = {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: {
    remoteAddress?: string;
  };
};

type CookieResponse = {
  cookie: (name: string, value: string, options: Record<string, unknown>) => void;
  clearCookie: (name: string, options: Record<string, unknown>) => void;
};

function toApiRole(role: UserRole): ApiRole {
  return role.toLowerCase() as ApiRole;
}

function toUserRole(role: ApiRole): UserRole {
  return role.toUpperCase() as UserRole;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getCookieValue(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const prefix = `${name}=`;
  const match = cookies.find((cookie) => cookie.startsWith(prefix));

  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  get cookieName() {
    return cookieName;
  }

  getCookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtlSeconds * 1000,
      path: "/"
    };
  }

  getClearCookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    };
  }

  setSessionCookie(response: CookieResponse, token: string) {
    response.cookie(cookieName, token, this.getCookieOptions());
  }

  clearSessionCookie(response: CookieResponse) {
    response.clearCookie(cookieName, this.getClearCookieOptions());
  }

  async register(payload: AuthPayload, request?: RequestMetadata) {
    const email = this.parseEmail(payload.email);
    const password = this.parsePassword(payload.password);
    const displayName = this.parseDisplayName(payload.displayName, email);

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });

    if (existingUser) {
      throw new ConflictException("Пользователь с такой электронной почтой уже существует");
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        role: "STUDENT",
        profile: {
          create: {
            displayName
          }
        }
      },
      include: { profile: true }
    });

    await this.recordAuthEvent(user.id, "ACCOUNT_REGISTERED", request);

    return {
      user: this.toSessionUser(user),
      token: this.signToken({ sub: user.id, exp: this.getExpiryTimestamp() })
    };
  }

  async login(payload: AuthPayload, request?: RequestMetadata) {
    const email = this.parseEmail(payload.email);
    const password = this.parsePassword(payload.password);

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true }
    });

    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException("Неверная электронная почта или пароль");
    }

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedException("Аккаунт пользователя неактивен");
    }

    await this.recordAuthEvent(user.id, "LOGIN_SUCCESS", request);

    return {
      user: this.toSessionUser(user),
      token: this.signToken({ sub: user.id, exp: this.getExpiryTimestamp() })
    };
  }

  async getSessionUser(request: RequestWithUser) {
    const token = this.getTokenFromRequest(request);

    if (!token) {
      return null;
    }

    const payload = this.verifyToken(token);

    if (!payload) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { profile: true }
    });

    if (!user || user.status !== "ACTIVE") {
      return null;
    }

    return this.toSessionUser(user);
  }

  async requestPasswordReset(payload: PasswordResetRequestPayload) {
    const email = this.parseEmail(payload.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true }
    });

    if (!user || user.status !== "ACTIVE") {
      return {
        accepted: true,
        message: "Если аккаунт существует, письмо для сброса пароля уже отправлено."
      };
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = this.hashResetToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({
        where: {
          userId: user.id,
          OR: [{ usedAt: { not: null } }, { expiresAt: { lt: new Date() } }]
        }
      }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt
        }
      })
    ]);
    await this.sendPasswordResetEmail(
      user.email,
      user.profile?.displayName ?? user.email,
      token
    );

    return {
      accepted: true,
      message: "Если аккаунт существует, письмо для сброса пароля уже отправлено.",
      ...(process.env.NODE_ENV !== "production" && !process.env.RESEND_API_KEY
        ? { devToken: token }
        : {})
    };
  }

  async resetPassword(payload: PasswordResetPayload) {
    const token = this.parseResetToken(payload.token);
    const password = this.parsePassword(payload.password);
    const reset = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashResetToken(token) }
    });

    if (!reset || reset.usedAt || reset.expiresAt <= new Date()) {
      throw new UnauthorizedException("Ссылка для сброса пароля недействительна или устарела");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: reset.userId },
        data: {
          passwordHash: await hashPassword(password)
        }
      }),
      this.prisma.passwordResetToken.update({
        where: { id: reset.id },
        data: { usedAt: new Date() }
      })
    ]);

    return {
      reset: true,
      message: "Пароль обновлён. Теперь можно войти."
    };
  }

  private getTokenFromRequest(request: RequestWithUser) {
    const authorization = this.getHeaderValue(request, "authorization");

    if (authorization?.startsWith("Bearer ")) {
      return authorization.slice("Bearer ".length);
    }

    return getCookieValue(this.getHeaderValue(request, "cookie") ?? undefined, cookieName);
  }

  private signToken(payload: TokenPayload) {
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signature = createHmac("sha256", this.getSecret())
      .update(encodedPayload)
      .digest("base64url");

    return `${encodedPayload}.${signature}`;
  }

  private verifyToken(token: string): TokenPayload | null {
    const [encodedPayload, signature] = token.split(".");

    if (!encodedPayload || !signature) {
      return null;
    }

    const expectedSignature = createHmac("sha256", this.getSecret())
      .update(encodedPayload)
      .digest("base64url");

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null;
    }

    try {
      const payload = JSON.parse(base64UrlDecode(encodedPayload)) as TokenPayload;

      if (!payload.sub || typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  private toSessionUser(user: {
    id: string;
    email: string;
    role: UserRole;
    profile: { displayName: string } | null;
  }): ApiSessionUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.profile?.displayName ?? user.email,
      role: toApiRole(user.role)
    };
  }

  private parseEmail(value: unknown) {
    if (typeof value !== "string") {
      throw new UnauthorizedException("Электронная почта должна быть строкой");
    }

    const email = value.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new UnauthorizedException("Укажите корректную электронную почту");
    }

    return email;
  }

  private parsePassword(value: unknown) {
    if (typeof value !== "string" || value.length < 8 || value.length > 128) {
      throw new UnauthorizedException("Пароль должен содержать от 8 до 128 символов");
    }

    return value;
  }

  private parseDisplayName(value: unknown, email: string) {
    if (value === undefined || value === null || value === "") {
      return email.split("@")[0] ?? "Ученик Magic English";
    }

    if (typeof value !== "string") {
      throw new UnauthorizedException("Имя должно быть строкой");
    }

    const displayName = value.trim();

    if (!displayName || displayName.length > 120) {
      throw new UnauthorizedException("Имя должно содержать от 1 до 120 символов");
    }

    return displayName;
  }

  private getExpiryTimestamp() {
    return Math.floor(Date.now() / 1000) + sessionTtlSeconds;
  }

  private async recordAuthEvent(
    userId: string,
    type: string,
    request?: RequestMetadata
  ) {
    if (!request) return;
    const forwarded = request.headers["x-forwarded-for"];
    const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const ip = forwardedIp?.split(",")[0]?.trim() ?? request.ip ?? request.socket?.remoteAddress;
    const userAgentValue = request.headers["user-agent"];
    const userAgent = Array.isArray(userAgentValue) ? userAgentValue[0] : userAgentValue;

    await this.prisma.activityEvent.create({
      data: {
        userId,
        type,
        ipHash: ip ? this.hashActivityValue(ip) : null,
        userAgent: userAgent?.slice(0, 500) ?? null
      }
    });

    if (type === "LOGIN_SUCCESS" && ip) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentLogins = await this.prisma.activityEvent.findMany({
        where: {
          userId,
          type: "LOGIN_SUCCESS",
          createdAt: { gte: since },
          ipHash: { not: null }
        },
        select: { ipHash: true }
      });
      const distinctIpHashes = new Set(
        recentLogins.map((event) => event.ipHash).filter(Boolean)
      );

      if (distinctIpHashes.size >= 3) {
        const existingSignal = await this.prisma.abuseSignal.findFirst({
          where: {
            userId,
            type: "ACCOUNT_SHARING_SUSPECTED",
            status: "OPEN",
            createdAt: { gte: since }
          }
        });

        if (!existingSignal) {
          await this.prisma.abuseSignal.create({
            data: {
              userId,
              type: "ACCOUNT_SHARING_SUSPECTED",
              severity: "HIGH",
              details: {
                distinctNetworks: distinctIpHashes.size,
                windowHours: 24
              }
            }
          });
        }
      }
    }
  }

  private hashResetToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private hashActivityValue(value: string) {
    return createHmac(
      "sha256",
      process.env.ACTIVITY_HASH_SECRET ?? this.getSecret()
    )
      .update(value)
      .digest("hex");
  }

  private parseResetToken(value: unknown) {
    if (typeof value !== "string" || value.length < 32 || value.length > 200) {
      throw new UnauthorizedException("Некорректная ссылка для сброса пароля");
    }

    return value;
  }

  private async sendPasswordResetEmail(email: string, name: string, token: string) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) return;
    const resetUrl = `${process.env.WEB_ORIGIN ?? "http://localhost:3000"}/login?reset=${encodeURIComponent(token)}`;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Magic English <accounts@magic-english-academy.com>",
        to: [email],
        subject: "Сброс пароля Magic English",
        html: `
          <div style="font-family:Arial,sans-serif;background:#f6f6f6;padding:32px">
            <div style="max-width:560px;margin:auto;background:#fff;border:1px solid #eee;border-radius:8px;padding:28px">
              <h1 style="margin-top:0;color:#2c2c2c">Сброс пароля</h1>
              <p>Здравствуйте, ${this.escapeHtml(name)}. Ссылка действует один час.</p>
              <a href="${resetUrl}" style="display:inline-block;background:#feb733;color:#fff;padding:13px 20px;border-radius:6px;text-decoration:none;font-weight:bold">Выбрать новый пароль</a>
            </div>
          </div>
        `
      })
    });

    if (!response.ok) {
      console.error(`Password reset email failed: ${response.status}`);
    }
  }

  private escapeHtml(value: string) {
    return value.replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        })[character] ?? character
    );
  }

  private getSecret() {
    const secret = process.env.AUTH_SECRET;

    if (secret && secret.length >= 32) {
      return secret;
    }

    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set to at least 32 characters in production");
    }

    return "local-dev-secret-change-before-production";
  }

  private getHeaderValue(request: RequestWithUser, name: string) {
    const value = request.headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  }
}

export { toUserRole };
