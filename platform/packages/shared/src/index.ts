export type UserRole = "student" | "teacher" | "admin" | "owner";

export type CourseLevelCode = "A1" | "A2" | "B1" | "B2" | "C1";

export type CourseLevelSummary = {
  code: CourseLevelCode;
  title: string;
  lessonCount: number;
  status: "legacy-linked" | "in-migration" | "native";
};

export type PlatformMetric = {
  label: string;
  value: string;
  tone: "neutral" | "good" | "warning";
};

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
};

export type SessionResponse = {
  user: SessionUser;
  mode: "dev-header-session";
};

export type AdminOverview = {
  metrics: PlatformMetric[];
  nativeMigrationPercent: number;
  riskSignals: Array<{
    label: string;
    count: number;
    tone: PlatformMetric["tone"];
  }>;
};
