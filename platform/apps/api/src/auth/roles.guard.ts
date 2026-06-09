import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PUBLIC_KEY } from "./public.decorator";
import { ROLES_KEY } from "./roles.decorator";
import { getDevSessionUser, hasRole } from "./dev-session";
import type { ApiRole, RequestWithUser } from "./auth.types";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    request.user = getDevSessionUser(request);

    if (isPublic) {
      return true;
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
}
