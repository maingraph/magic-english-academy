"use client";

import { FormEvent, useState } from "react";
import { Send } from "lucide-react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export function LessonHomework({ slug }: { slug: string }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");

    const response = await fetch(`${apiBaseUrl}/learning/lessons/${slug}/homework`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text })
    });

    if (response.ok) {
      setText("");
      setStatus("saved");
    } else {
      setStatus("error");
    }
  }

  return (
    <section className="lesson-block homework-block">
      <span className="admin-kicker">Домашняя работа</span>
      <h2>Примените материал урока</h2>
      <p>Напишите 3–5 предложений. Преподаватель проверит точность.</p>
      <form onSubmit={submit}>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={6}
          minLength={20}
          maxLength={5000}
          placeholder="Напишите ваш ответ..."
          required
        />
        <button disabled={status === "saving"} type="submit">
          <Send size={17} />
          {status === "saving" ? "Отправляем..." : "Отправить на проверку"}
        </button>
      </form>
      {status === "saved" ? <strong className="success-text">Отправлено на проверку.</strong> : null}
      {status === "error" ? <strong className="error-text">Не удалось отправить работу.</strong> : null}
    </section>
  );
}
