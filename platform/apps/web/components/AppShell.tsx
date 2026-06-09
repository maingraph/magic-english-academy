"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Общая информация" },
  { href: "/courses", label: "План" },
  { href: "/dashboard", label: "Мой прогресс" },
  { href: "/admin", label: "Админка" }
];

type AppShellProps = {
  children: React.ReactNode;
  showBanner?: boolean;
};

export function AppShell({ children, showBanner = true }: AppShellProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <nav className="top-menu" aria-label="Основная навигация">
        <div className="menu-container">
          <div className="menu-content">
            <Link href="/" className="logo" onClick={() => setIsMenuOpen(false)}>
              MAG<span>IC ENGLISH</span>
            </Link>

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
              {navItems.map((item) => (
                <Link
                  className={pathname === item.href ? "active" : ""}
                  href={item.href}
                  key={item.href}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                className="gift-link festive"
                href="/login"
                onClick={() => setIsMenuOpen(false)}
              >
                Войти <span className="gift-emoji">→</span>
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
              alt="Magic English Academy"
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
