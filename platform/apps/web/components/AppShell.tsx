"use client";

import {
  Award,
  BarChart3,
  BookOpen,
  Bot,
  ChevronRight,
  CircleUserRound,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  MessagesSquare,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  StickyNote,
  Trophy,
  Users,
  X
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AssistantDrawer } from "./AssistantDrawer";
import { useSession } from "./SessionProvider";

const studentNav = [
  { href: "/dashboard", label: "Обзор", icon: LayoutDashboard },
  { href: "/courses", label: "Курс", icon: GraduationCap },
  { href: "/feed", label: "Лента", icon: Newspaper },
  { href: "/notes", label: "Заметки", icon: StickyNote },
  { href: "/assistant", label: "Magic AI", icon: Bot },
  { href: "/dictionary", label: "Словарь", icon: Library },
  { href: "/leaderboard", label: "Рейтинг", icon: Trophy },
  { href: "/achievements", label: "Достижения", icon: Award },
  { href: "/profile", label: "Профиль", icon: CircleUserRound }
];

const adminNav = [
  { href: "/admin", label: "Обзор", icon: BarChart3 },
  { href: "/admin/course", label: "Конструктор курса", icon: BookOpen },
  { href: "/admin/articles", label: "Статьи", icon: FileText },
  { href: "/admin/users", label: "Пользователи", icon: Users },
  { href: "/admin/security", label: "Безопасность", icon: ShieldCheck },
  { href: "/admin/settings", label: "Настройки", icon: Settings }
];

const workspacePrefixes = [
  "/dashboard",
  "/feed",
  "/notes",
  "/assistant",
  "/dictionary",
  "/leaderboard",
  "/achievements",
  "/profile",
  "/admin"
];
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

function isActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

type AppShellProps = {
  children: React.ReactNode;
  showBanner?: boolean;
};

export function AppShell({ children, showBanner = true }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, status, logout } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const isLesson = pathname.includes("/lessons/");
  const isWorkspace =
    workspacePrefixes.some((prefix) => pathname.startsWith(prefix)) ||
    isLesson ||
    (status === "ready" && Boolean(user) && pathname.startsWith("/courses"));
  const canAdmin = user?.role === "admin" || user?.role === "owner";

  useEffect(() => {
    setIsSidebarCollapsed(localStorage.getItem("magic-sidebar-collapsed") === "true");
  }, []);

  useEffect(() => {
    if (status !== "ready" || !user) return;
    void fetch(`${apiBaseUrl}/profile/activity/visit`, {
      method: "POST",
      credentials: "include"
    });
  }, [status, user]);

  function toggleSidebar() {
    setIsSidebarCollapsed((current) => {
      const next = !current;
      localStorage.setItem("magic-sidebar-collapsed", String(next));
      return next;
    });
  }

  async function handleLogout() {
    await logout();
    navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_PRIVATE_CACHE" });
    setIsMenuOpen(false);
    router.push("/login");
  }

  if (isWorkspace) {
    return (
      <div className={`app-shell ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <aside className={`app-sidebar ${isMenuOpen ? "open" : ""}`}>
          <div className="app-sidebar-head">
            <Link href="/dashboard" className="app-brand" onClick={() => setIsMenuOpen(false)}>
              <span className="app-brand-full"><span>MAG</span>IC ENGLISH</span>
              <span className="app-brand-mark" aria-hidden="true">✦</span>
            </Link>
            <button
              className="sidebar-collapse"
              onClick={toggleSidebar}
              type="button"
              aria-label={isSidebarCollapsed ? "Развернуть меню" : "Свернуть меню"}
              title={isSidebarCollapsed ? "Развернуть меню" : "Свернуть меню"}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
            </button>
            <button
              className="sidebar-close"
              onClick={() => setIsMenuOpen(false)}
              type="button"
              aria-label="Закрыть навигацию"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="app-navigation" aria-label="Навигация ученика">
            <span className="app-nav-label">Обучение</span>
            {studentNav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  className={isActive(pathname, item.href) ? "active" : ""}
                  href={item.href}
                  key={item.href}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Icon size={19} />
                  <span>{item.label}</span>
                  <ChevronRight className="nav-chevron" size={15} />
                </Link>
              );
            })}
          </nav>

          {canAdmin ? (
            <nav className="app-navigation" aria-label="Навигация администратора">
              <span className="app-nav-label">Администрирование</span>
              {adminNav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    className={isActive(pathname, item.href) ? "active" : ""}
                    href={item.href}
                    key={item.href}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Icon size={19} />
                    <span>{item.label}</span>
                    <ChevronRight className="nav-chevron" size={15} />
                  </Link>
                );
              })}
            </nav>
          ) : null}

          <a
            className="community-link"
            href={process.env.NEXT_PUBLIC_TELEGRAM_URL ?? "https://t.me/"}
            rel="noreferrer"
            target="_blank"
          >
            <MessagesSquare size={19} />
            <span>
              Форум сообщества
              <small>Обсуждения в Telegram</small>
            </span>
          </a>
        </aside>

        <div
          className={`app-sidebar-overlay ${isMenuOpen ? "open" : ""}`}
          onClick={() => setIsMenuOpen(false)}
        />

        <div className="app-workspace">
          <header className="app-topbar">
            <button
              className="app-menu-button"
              onClick={() => setIsMenuOpen(true)}
              type="button"
              aria-label="Открыть навигацию"
            >
              <Menu size={22} />
            </button>
            <Link className="mobile-app-brand" href="/dashboard">
              MAGIC ENGLISH
            </Link>
            <div className="app-topbar-actions">
              {isLesson ? (
                <button
                  aria-expanded={isAssistantOpen}
                  className="assistant-trigger"
                  onClick={() => setIsAssistantOpen(true)}
                  type="button"
                  aria-label="Открыть ассистента"
                >
                  <Bot size={18} />
                  <span>Ассистент</span>
                </button>
              ) : null}
              <Link className="profile-trigger" href="/profile">
                <span className="profile-avatar">
                  {user?.displayName?.slice(0, 1).toUpperCase() ?? "M"}
                </span>
                <span className="profile-copy">
                  <strong>{user?.displayName ?? "Загрузка..."}</strong>
                  <small>
                    {user?.role === "admin" ? "администратор" : user?.role === "owner" ? "владелец" : "ученик"}
                  </small>
                </span>
              </Link>
              <button className="logout-icon" onClick={handleLogout} type="button" title="Выйти">
                <LogOut size={18} />
              </button>
            </div>
          </header>

          <div className="app-content">{children}</div>
        </div>

        <nav className="mobile-bottom-nav" aria-label="Мобильная навигация">
          {studentNav.slice(0, 4).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className={isActive(pathname, item.href) ? "active" : ""}
                href={item.href}
                key={item.href}
              >
                <Icon size={21} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        {isLesson ? (
          <AssistantDrawer
            onClose={() => setIsAssistantOpen(false)}
            onOpen={() => setIsAssistantOpen(true)}
            open={isAssistantOpen}
          />
        ) : null}
      </div>
    );
  }

  const landingUrl = process.env.NEXT_PUBLIC_LANDING_URL ?? "https://magic-english-academy.com";
  const publicNav = [
    { href: "/courses", label: "Программа курса", icon: GraduationCap },
    { href: "/articles", label: "Статьи", icon: FileText }
  ];

  return (
    <>
      <nav className="top-menu" aria-label="Основная навигация">
        <div className="menu-container">
          <div className="menu-content">
            <a href={landingUrl} className="logo" onClick={() => setIsMenuOpen(false)}>
              MAG<span>IC ENGLISH</span>
            </a>
            <button
              className={`burger ${isMenuOpen ? "active" : ""}`}
              type="button"
              aria-label="Открыть меню"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((value) => !value)}
            >
              <span />
              <span />
              <span />
            </button>
            <div className={`nav-links ${isMenuOpen ? "active" : ""}`}>
              <a href={landingUrl}>Главная</a>
              {publicNav.map((item) => (
                <Link
                  className={isActive(pathname, item.href) ? "active" : ""}
                  href={item.href}
                  key={item.href}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <a
                href={process.env.NEXT_PUBLIC_TELEGRAM_URL ?? "https://t.me/"}
                rel="noreferrer"
                target="_blank"
              >
                Сообщество
              </a>
              <Link className="gift-link festive" href={user ? "/dashboard" : "/login"}>
                {user ? "Открыть платформу" : "Войти"} <span className="gift-emoji">→</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <div
        className={`menu-overlay ${isMenuOpen ? "active" : ""}`}
        onClick={() => setIsMenuOpen(false)}
      />
      {showBanner ? (
        <header className="header">
          <div className="container">
            <Image
              src="/images/banner-online-school.jpg"
              alt="Академия Magic English"
              className="banner"
              width={2880}
              height={700}
              priority
            />
            <hr />
          </div>
        </header>
      ) : null}
      {children}
    </>
  );
}
