"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "./SessionProvider";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const showDemoAccounts = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

export function LoginForm() {
  const router = useRouter();
  const { refresh } = useSession();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/dashboard";
  const resetToken = searchParams.get("reset");
  const [email, setEmail] = useState("student@magic.local");
  const [password, setPassword] = useState("MagicStudent123!");
  const [mode, setMode] = useState<"login" | "forgot" | "reset">(
    resetToken ? "reset" : "login"
  );
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState(
    "Используйте аккаунт, который выдал администратор после покупки курса."
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage(
      mode === "login"
        ? "Входим..."
        : mode === "forgot"
            ? "Отправляем ссылку..."
            : "Обновляем пароль..."
    );

    try {
      const endpoint =
        mode === "forgot"
          ? "password/forgot"
          : mode === "reset"
            ? "password/reset"
            : "login";
      const response = await fetch(`${apiBaseUrl}/auth/${endpoint}`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
          token: resetToken
        })
      });

      if (!response.ok) {
        throw new Error(
          mode === "login"
            ? "Неверный логин или пароль."
            : "Не удалось выполнить запрос."
        );
      }

      if (mode === "forgot") {
        setStatus("idle");
        setMessage("Если аккаунт существует, ссылка отправлена на email.");
        return;
      }

      if (mode === "reset") {
        setMode("login");
        setPassword("");
        setStatus("idle");
        setMessage("Пароль обновлен. Теперь войдите.");
        return;
      }

      await refresh();
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Ошибка входа.");
    }
  }

  function selectDemoAccount(role: "student" | "admin") {
    setMode("login");
    setEmail(role === "student" ? "student@magic.local" : "admin@magic.local");
    setPassword(role === "student" ? "MagicStudent123!" : "MagicAdmin123!");
    setMessage(
      role === "student"
        ? "Выбран демо-аккаунт ученика."
        : "Выбран демо-аккаунт администратора."
    );
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="auth-tabs">
        <button
          className={mode === "login" ? "active" : ""}
          onClick={() => setMode("login")}
          type="button"
        >
          Вход
        </button>
        <span>Аккаунт создаёт администратор</span>
      </div>

      {mode === "forgot" || mode === "reset" ? (
        <div className="auth-mode-heading">
          <strong>{mode === "forgot" ? "Восстановление пароля" : "Новый пароль"}</strong>
          <button onClick={() => setMode("login")} type="button">
            Назад ко входу
          </button>
        </div>
      ) : null}

      {mode === "login" && showDemoAccounts ? (
        <div className="demo-accounts">
          <span>Быстрый демо-вход</span>
          <div className="demo-account-buttons">
            <button onClick={() => selectDemoAccount("student")} type="button">
              Ученик
            </button>
            <button onClick={() => selectDemoAccount("admin")} type="button">
              Админ
            </button>
          </div>
        </div>
      ) : null}

      {mode !== "reset" ? (
        <label>
          Логин
          <input
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Введите ваш email"
            required
            type="email"
            value={email}
          />
        </label>
      ) : null}
      {mode !== "forgot" ? (
        <label>
          Пароль
          <input
            minLength={8}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder={mode === "reset" ? "Введите новый пароль" : "Введите ваш пароль"}
            required
            type="password"
            value={password}
          />
        </label>
      ) : null}
      <button className="auth-submit" disabled={status === "saving"} type="submit">
        {status === "saving"
          ? "Подождите..."
          : mode === "login"
            ? "Войти"
            : mode === "forgot"
                ? "Отправить ссылку"
                : "Сохранить пароль"}
      </button>
      {mode === "login" ? (
        <button className="forgot-password" onClick={() => setMode("forgot")} type="button">
          Забыли пароль?
        </button>
      ) : null}
      <p className={`auth-message ${status}`}>{message}</p>
    </form>
  );
}
