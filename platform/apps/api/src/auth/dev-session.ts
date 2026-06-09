import type { ApiRole, ApiSessionUser, RequestWithUser } from "./auth.types";

const roleRank: Record<ApiRole, number> = {
  student: 1,
  teacher: 2,
  admin: 3,
  owner: 4
};

const validRoles = new Set<ApiRole>(["student", "teacher", "admin", "owner"]);

function getHeaderValue(
  request: RequestWithUser,
  name: string,
  fallback: string
) {
  const value = request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
}

export function getDevSessionUser(request: RequestWithUser): ApiSessionUser {
  const requestedRole = getHeaderValue(request, "x-user-role", "student");
  const role = validRoles.has(requestedRole as ApiRole)
    ? (requestedRole as ApiRole)
    : "student";

  return {
    id: getHeaderValue(request, "x-user-id", "dev-user"),
    email: getHeaderValue(request, "x-user-email", "student@magic.local"),
    displayName: getHeaderValue(request, "x-user-name", "Magic Student"),
    role
  };
}

export function hasRole(userRole: ApiRole, requiredRoles: ApiRole[]) {
  if (requiredRoles.length === 0) {
    return true;
  }

  return requiredRoles.some((role) => roleRank[userRole] >= roleRank[role]);
}
