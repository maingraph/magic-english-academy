"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ApiRole = "student" | "teacher" | "admin" | "owner";

type SessionResponse = {
  user: {
    email: string;
    displayName: string;
    role: ApiRole;
  } | null;
};

const roleRank: Record<ApiRole, number> = {
  student: 1,
  teacher: 2,
  admin: 3,
  owner: 4
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export function AuthGate({
  children,
  role = "student"
}: {
  children: React.ReactNode;
  role?: ApiRole;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "forbidden">("loading");

  useEffect(() => {
    const controller = new AbortController();

    async function loadSession() {
      try {
        const response = await fetch(`${apiBaseUrl}/auth/session`, {
          credentials: "include",
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Session failed: ${response.status}`);
        }

        const session = (await response.json()) as SessionResponse;

        if (!session.user) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }

        if (roleRank[session.user.role] < roleRank[role]) {
          setStatus("forbidden");
          return;
        }

        setStatus("ready");
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error);
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        }
      }
    }

    void loadSession();

    return () => controller.abort();
  }, [pathname, role, router]);

  if (status === "loading") {
    return (
      <section className="soft-card api-status">
        <h2>Проверяем доступ</h2>
        <p>Загружаем сессию...</p>
      </section>
    );
  }

  if (status === "forbidden") {
    return (
      <section className="soft-card api-status warning">
        <h2>Нет доступа</h2>
        <p>Для этого раздела нужна другая роль аккаунта.</p>
      </section>
    );
  }

  return <>{children}</>;
}
