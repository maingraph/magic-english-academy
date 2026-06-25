"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ApiRole = "student" | "teacher" | "admin" | "owner";

export type SessionUser = {
  id?: string;
  email: string;
  displayName: string;
  role: ApiRole;
};

type SessionContextValue = {
  user: SessionUser | null;
  status: "loading" | "ready";
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/auth/session`, {
        credentials: "include"
      });

      if (!response.ok) {
        setUser(null);
        return;
      }

      const session = (await response.json()) as { user: SessionUser | null };
      setUser(session.user);
    } catch {
      setUser(null);
    } finally {
      setStatus("ready");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch(`${apiBaseUrl}/auth/logout`, {
      method: "POST",
      credentials: "include"
    });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, status, refresh, logout }),
    [logout, refresh, status, user]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used inside SessionProvider");
  }

  return context;
}
