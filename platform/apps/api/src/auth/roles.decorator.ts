import { SetMetadata } from "@nestjs/common";
import type { ApiRole } from "./auth.types";

export const ROLES_KEY = "roles";

export const Roles = (...roles: ApiRole[]) => SetMetadata(ROLES_KEY, roles);
