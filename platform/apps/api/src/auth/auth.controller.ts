import { Body, Controller, Get, Inject, Post, Res } from "@nestjs/common";
import { CurrentUser } from "./current-user.decorator";
import { Public } from "./public.decorator";
import type { ApiSessionUser } from "./auth.types";
import type { AuthPayload } from "./auth.service";
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
  @Post("login")
  async login(
    @Body() payload: AuthPayload,
    @Res({ passthrough: true }) response: CookieResponse
  ) {
    const session = await this.authService.login(payload);
    this.authService.setSessionCookie(response, session.token);

    return {
      user: session.user,
      mode: "cookie-session"
    };
  }

  @Public()
  @Post("register")
  async register(
    @Body() payload: AuthPayload,
    @Res({ passthrough: true }) response: CookieResponse
  ) {
    const session = await this.authService.register(payload);
    this.authService.setSessionCookie(response, session.token);

    return {
      user: session.user,
      mode: "cookie-session"
    };
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
