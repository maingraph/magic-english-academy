import { Controller, Get } from "@nestjs/common";
import { CurrentUser } from "./current-user.decorator";
import { Public } from "./public.decorator";
import type { ApiSessionUser } from "./auth.types";

@Controller("auth")
export class AuthController {
  @Public()
  @Get("session")
  getSession(@CurrentUser() user: ApiSessionUser) {
    return {
      user,
      mode: "dev-header-session"
    };
  }
}
