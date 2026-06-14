import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PUBLIC_KEY } from "./public.decorator";
import { ROLES_KEY } from "./roles.decorator";
import { getDevSessionUser, hasRole } from "./dev-session";
import type { ApiRole, RequestWithUser } from "./auth.types";
import { AuthService } from "./auth.service";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(Reflector) private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    request.user = (await this.authService.getSessionUser(request)) ?? undefined;

    if (isPublic) {
      return true;
    }

    if (!request.user && this.allowsDevHeaderSession(request)) {
      request.user = getDevSessionUser(request);
    }

    if (!request.user) {
      throw new UnauthorizedException("Authentication required");
    }

    const requiredRoles = this.reflector.getAllAndOverride<ApiRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    ) ?? ["student"];

    if (!hasRole(request.user.role, requiredRoles)) {
      throw new ForbiddenException("Insufficient role for this endpoint");
    }

    return true;
  }

  private allowsDevHeaderSession(request: RequestWithUser) {
    if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEV_AUTH === "false") {
      return false;
    }

    return Boolean(request.headers["x-user-role"] || request.headers["x-user-email"]);
  }
}
