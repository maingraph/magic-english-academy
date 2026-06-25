"use client";

import { Search, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

type UserRow = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  completedLessons: number;
  points: number;
  homeworkCount: number;
  lastActiveAt: string | null;
  openSignals: number;
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

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`${apiBaseUrl}/admin/users?q=${encodeURIComponent(query)}`, {
        credentials: "include",
        signal: controller.signal
      })
        .then((response) => (response.ok ? response.json() : { users: [] }))
        .then((data: { users: UserRow[] }) => setUsers(data.users))
        .catch(() => undefined);
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <section className="workspace-panel">
      <div className="panel-heading">
        <div>
          <span>Аккаунты и учебные данные</span>
          <h2>Пользователи</h2>
        </div>
      </div>
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
          <span>Домашние работы</span>
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
            <strong>{user.homeworkCount}</strong>
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
