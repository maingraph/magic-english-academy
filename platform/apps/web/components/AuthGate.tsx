"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ApiRole, useSession } from "./SessionProvider";

const roleRank: Record<ApiRole, number> = {
  student: 1,
  teacher: 2,
  admin: 3,
  owner: 4
};

export function AuthGate({
  children,
  role = "student"
}: {
  children: React.ReactNode;
  role?: ApiRole;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, user } = useSession();

  useEffect(() => {
    if (status === "ready" && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, router, status, user]);

  if (status === "loading") {
    return (
      <section className="soft-card api-status">
        <h2>Проверяем доступ</h2>
        <p>Загружаем сессию...</p>
      </section>
    );
  }

  if (user && roleRank[user.role] < roleRank[role]) {
    return (
      <section className="soft-card api-status warning">
        <h2>Нет доступа</h2>
        <p>Для этого раздела нужна другая роль аккаунта.</p>
      </section>
    );
  }

  return user ? <>{children}</> : null;
}
