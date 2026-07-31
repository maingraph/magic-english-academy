"use client";

import { Bell, CheckCheck, Moon, Search, Sun, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

type SearchResult = { type: string; id: string; title: string; subtitle?: string | null; href: string };
type Notification = { id: string; title: string; body: string; href?: string | null; readAt?: string | null; createdAt: string };

export function ShellTools() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("magic-theme");
    const next = saved === "dark" || (!saved && matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    fetch(`${apiBaseUrl}/notifications?unread=true`, { credentials: "include" })
      .then((response) => response.ok ? response.json() : [])
      .then((data) => setNotifications(data as Notification[]))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setNotificationsOpen(false);
      }
    }
    addEventListener("keydown", shortcut);
    return () => removeEventListener("keydown", shortcut);
  }, []);

  function updateSearch(value: string) {
    setQuery(value);
    setSearchOpen(true);
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().length < 2) return setResults([]);
    timer.current = setTimeout(() => {
      fetch(`${apiBaseUrl}/search?q=${encodeURIComponent(value)}`, { credentials: "include" })
        .then((response) => response.ok ? response.json() : { results: [] })
        .then((data: { results: SearchResult[] }) => setResults(data.results))
        .catch(() => setResults([]));
    }, 220);
  }

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("magic-theme", next ? "dark" : "light");
    document.documentElement.dataset.theme = next ? "dark" : "light";
  }

  async function readAll() {
    await fetch(`${apiBaseUrl}/notifications/read-all`, { method: "PATCH", credentials: "include" });
    setNotifications([]);
  }

  return (
    <div className="shell-tools">
      <label className="shell-search">
        <Search size={18} />
        <input value={query} onFocus={() => setSearchOpen(true)} onChange={(event) => updateSearch(event.target.value)} placeholder="Найти урок, слово или заметку" />
        <kbd>⌘K</kbd>
      </label>
      <button type="button" onClick={toggleTheme} aria-label="Сменить тему">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
      <button type="button" className="notification-button" onClick={() => setNotificationsOpen((value) => !value)} aria-label="Уведомления">
        <Bell size={18} />{notifications.length ? <span>{notifications.length}</span> : null}
      </button>
      {searchOpen ? (
        <div className="shell-popover search-popover">
          <header><strong>Поиск</strong><button type="button" onClick={() => setSearchOpen(false)}><X size={17} /></button></header>
          {query.trim().length < 2 ? <p>Введите минимум две буквы.</p> : results.length ? results.map((item) => (
            <Link href={item.href} key={`${item.type}-${item.id}`} onClick={() => setSearchOpen(false)}><strong>{item.title}</strong><small>{item.subtitle ?? item.type}</small></Link>
          )) : <p>Ничего не найдено.</p>}
        </div>
      ) : null}
      {notificationsOpen ? (
        <div className="shell-popover notification-popover">
          <header><strong>Уведомления</strong><button type="button" onClick={readAll} title="Прочитать всё"><CheckCheck size={17} /></button></header>
          {notifications.length ? notifications.map((item) => <Link href={item.href ?? "/dashboard"} key={item.id}><strong>{item.title}</strong><small>{item.body}</small></Link>) : <p>Новых уведомлений нет.</p>}
        </div>
      ) : null}
    </div>
  );
}
