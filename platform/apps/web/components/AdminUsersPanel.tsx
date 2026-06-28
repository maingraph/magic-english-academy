"use client";

import { KeyRound, Search, ShieldAlert, UserPlus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type UserRow = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  completedLessons: number;
  points: number;
  checkpointCount: number;
  lastActiveAt: string | null;
  openSignals: number;
};

type CreatedAccount = {
  user: {
    email: string;
    displayName: string;
  };
  temporaryPassword: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const roleLabels: Record<string, string> = {
  student: "Ученик",
  admin: "Администратор",
  owner: "Владелец"
};

export function AdminUsersPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [createdAccount, setCreatedAccount] = useState<CreatedAccount | null>(null);
  const [createStatus, setCreateStatus] = useState<"idle" | "saving" | "error">("idle");

  async function loadUsers(signal?: AbortSignal) {
    const response = await fetch(`${apiBaseUrl}/admin/users?q=${encodeURIComponent(query)}`, {
      credentials: "include",
      signal
    });
    const data = response.ok ? ((await response.json()) as { users: UserRow[] }) : { users: [] };
    setUsers(data.users);
  }

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      loadUsers(controller.signal).catch(() => undefined);
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  async function createAccount(event: FormEvent) {
    event.preventDefault();
    setCreateStatus("saving");
    setCreatedAccount(null);

    try {
      const response = await fetch(`${apiBaseUrl}/admin/users`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, displayName })
      });

      if (!response.ok) {
        throw new Error("Не удалось создать аккаунт.");
      }

      setCreatedAccount((await response.json()) as CreatedAccount);
      setEmail("");
      setDisplayName("");
      setCreateStatus("idle");
      await loadUsers();
    } catch {
      setCreateStatus("error");
    }
  }

  return (
    <section className="workspace-panel">
      <div className="panel-heading">
        <div>
          <span>Аккаунты и учебные данные</span>
          <h2>Пользователи</h2>
        </div>
      </div>
      <form className="admin-account-form" onSubmit={createAccount}>
        <label>
          Email ученика
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="student@example.com"
            required
            type="email"
          />
        </label>
        <label>
          Имя
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Имя для профиля"
          />
        </label>
        <button disabled={createStatus === "saving"} type="submit">
          <UserPlus size={17} />
          {createStatus === "saving" ? "Создаём..." : "Создать аккаунт"}
        </button>
      </form>
      {createdAccount ? (
        <div className="created-account">
          <KeyRound size={18} />
          <span>
            <strong>{createdAccount.user.email}</strong>
            <small>Пароль: {createdAccount.temporaryPassword}</small>
          </span>
        </div>
      ) : null}
      {createStatus === "error" ? (
        <p className="form-message error">Аккаунт не создан. Проверьте email.</p>
      ) : null}
      <div className="workspace-search">
        <Search size={18} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск по имени или электронной почте"
          aria-label="Поиск пользователей"
        />
      </div>
      <div className="users-table">
        <div className="users-row header">
          <span>Пользователь</span>
          <span>Роль</span>
          <span>Уроки</span>
          <span>Баллы</span>
          <span>Проверочные</span>
          <span>Последняя активность</span>
          <span>Сигналы</span>
        </div>
        {users.map((user) => (
          <article className="users-row" key={user.id}>
            <span>
              <strong>{user.displayName}</strong>
              <small>{user.email}</small>
            </span>
            <span className="role-badge">{roleLabels[user.role] ?? user.role}</span>
            <strong>{user.completedLessons}</strong>
            <strong>{user.points}</strong>
            <strong>{user.checkpointCount}</strong>
            <span>{user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString("ru-RU") : "—"}</span>
            <span className={user.openSignals > 0 ? "signal-count active" : "signal-count"}>
              <ShieldAlert size={15} />
              {user.openSignals}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
