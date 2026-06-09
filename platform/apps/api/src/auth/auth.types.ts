export type ApiRole = "student" | "teacher" | "admin" | "owner";

export type ApiSessionUser = {
  id: string;
  email: string;
  displayName: string;
  role: ApiRole;
};

export type RequestWithUser = {
  headers: Record<string, string | string[] | undefined>;
  user?: ApiSessionUser;
};
