"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SessionResponse = {
  user: {
    email: string;
    displayName: string;
    role: string;
  } | null;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export function AuthStatus({ onNavigate }: { onNavigate?: () => void }) {
  const [session, setSession] = useState<SessionResponse | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSession() {
      try {
        const response = await fetch(`${apiBaseUrl}/auth/session`, {
          credentials: "include",
          signal: controller.signal
        });

        if (response.ok) {
          setSession((await response.json()) as SessionResponse);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error);
        }
      }
    }

    void loadSession();

    return () => controller.abort();
  }, []);

  async function logout() {
    await fetch(`${apiBaseUrl}/auth/logout`, {
      method: "POST",
      credentials: "include"
    });
    setSession({ user: null });
    onNavigate?.();
    window.location.href = "/login";
  }

  if (!session?.user) {
    return (
      <Link className="gift-link festive" href="/login" onClick={onNavigate}>
        Войти <span className="gift-emoji">→</span>
      </Link>
    );
  }

  return (
    <div className="auth-nav">
      <span>{session.user.displayName}</span>
      <button type="button" onClick={logout}>
        Выйти
      </button>
    </div>
  );
}
