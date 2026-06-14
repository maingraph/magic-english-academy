"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/dashboard";
  const [email, setEmail] = useState("student@magic.local");
  const [password, setPassword] = useState("MagicStudent123!");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("Используйте выданный логин или создайте учебный аккаунт.");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage(mode === "login" ? "Входим..." : "Создаем аккаунт...");

    try {
      const response = await fetch(`${apiBaseUrl}/auth/${mode}`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
          displayName
        })
      });

      if (!response.ok) {
        throw new Error(mode === "login" ? "Неверный логин или пароль." : "Не удалось создать аккаунт.");
      }

      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Ошибка входа.");
    }
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
        <button
          className={mode === "register" ? "active" : ""}
          onClick={() => setMode("register")}
          type="button"
        >
          Регистрация
        </button>
      </div>

      {mode === "register" ? (
        <label>
          Имя
          <input
            name="displayName"
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Как вас назвать"
            type="text"
            value={displayName}
          />
        </label>
      ) : null}

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
      <label>
        Пароль
        <input
          minLength={8}
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Введите ваш пароль"
          required
          type="password"
          value={password}
        />
      </label>
      <button className="auth-submit" disabled={status === "saving"} type="submit">
        {status === "saving" ? "Подождите..." : mode === "login" ? "Войти" : "Создать аккаунт"}
      </button>
      <p className={`auth-message ${status}`}>{message}</p>
    </form>
  );
}
