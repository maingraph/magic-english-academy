import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
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

  async register(payload: AuthPayload) {
    const email = this.parseEmail(payload.email);
    const password = this.parsePassword(payload.password);
    const displayName = this.parseDisplayName(payload.displayName, email);

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });

    if (existingUser) {
      throw new ConflictException("User with this email already exists");
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

    return {
      user: this.toSessionUser(user),
      token: this.signToken({ sub: user.id, exp: this.getExpiryTimestamp() })
    };
  }

  async login(payload: AuthPayload) {
    const email = this.parseEmail(payload.email);
    const password = this.parsePassword(payload.password);

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true }
    });

    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedException("User account is not active");
    }

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
      throw new UnauthorizedException("email must be a string");
    }

    const email = value.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new UnauthorizedException("email must be valid");
    }

    return email;
  }

  private parsePassword(value: unknown) {
    if (typeof value !== "string" || value.length < 8 || value.length > 128) {
      throw new UnauthorizedException("password must be between 8 and 128 characters");
    }

    return value;
  }

  private parseDisplayName(value: unknown, email: string) {
    if (value === undefined || value === null || value === "") {
      return email.split("@")[0] ?? "Magic Student";
    }

    if (typeof value !== "string") {
      throw new UnauthorizedException("displayName must be a string");
    }

    const displayName = value.trim();

    if (!displayName || displayName.length > 120) {
      throw new UnauthorizedException("displayName must be between 1 and 120 characters");
    }

    return displayName;
  }

  private getExpiryTimestamp() {
    return Math.floor(Date.now() / 1000) + sessionTtlSeconds;
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
