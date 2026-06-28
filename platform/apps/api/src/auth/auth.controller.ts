import { Body, Controller, Get, Inject, Post, Req, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "./current-user.decorator";
import { Public } from "./public.decorator";
import type { ApiSessionUser } from "./auth.types";
import type {
  AuthPayload,
  PasswordResetPayload,
  PasswordResetRequestPayload,
  RequestMetadata
} from "./auth.service";
import { AuthService } from "./auth.service";

type CookieResponse = {
  cookie: (name: string, value: string, options: Record<string, unknown>) => void;
  clearCookie: (name: string, options: Record<string, unknown>) => void;
};

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Public()
  @Get("session")
  getSession(@CurrentUser() user?: ApiSessionUser) {
    return {
      user: user ?? null,
      mode: user ? "cookie-session" : "anonymous"
    };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("login")
  async login(
    @Body() payload: AuthPayload,
    @Req() request: RequestMetadata,
    @Res({ passthrough: true }) response: CookieResponse
  ) {
    const session = await this.authService.login(payload, request);
    this.authService.setSessionCookie(response, session.token);

    return {
      user: session.user,
      mode: "cookie-session"
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("password/forgot")
  requestPasswordReset(@Body() payload: PasswordResetRequestPayload) {
    return this.authService.requestPasswordReset(payload);
  }

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post("password/reset")
  resetPassword(@Body() payload: PasswordResetPayload) {
    return this.authService.resetPassword(payload);
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) response: CookieResponse) {
    this.authService.clearSessionCookie(response);

    return {
      user: null,
      mode: "anonymous"
    };
  }
}
