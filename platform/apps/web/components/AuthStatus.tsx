"use client";

import Link from "next/link";
import { useSession } from "./SessionProvider";

export function AuthStatus({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useSession();

  async function handleLogout() {
    await logout();
    onNavigate?.();
    window.location.href = "/login";
  }

  if (!user) {
    return (
      <Link className="gift-link festive" href="/login" onClick={onNavigate}>
        Войти <span className="gift-emoji">→</span>
      </Link>
    );
  }

  return (
    <div className="auth-nav">
      <Link href="/profile" onClick={onNavigate}>
        {user.displayName}
      </Link>
      <button type="button" onClick={handleLogout}>
        Log out
      </button>
    </div>
  );
}
