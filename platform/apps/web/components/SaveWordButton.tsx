"use client";

import { BookmarkCheck, BookmarkPlus } from "lucide-react";
import { useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export function SaveWordButton({
  term,
  translation,
  definition,
  lessonSlug
}: {
  term: string;
  translation: string;
  definition: string;
  lessonSlug: string;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    setStatus("saving");
    const response = await fetch(`${apiBaseUrl}/dictionary/quick-save`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        term,
        translation,
        definition,
        lessonSlug
      })
    });
    setStatus(response.ok ? "saved" : "error");
  }

  return (
    <button
      className={`inline-save-word ${status}`}
      disabled={status === "saving" || status === "saved"}
      onClick={save}
      type="button"
    >
      {status === "saved" ? <BookmarkCheck size={17} /> : <BookmarkPlus size={17} />}
      {status === "saving"
          ? "Сохраняем..."
        : status === "saved"
          ? "Сохранено в словарь"
          : status === "error"
            ? "Войдите, чтобы сохранить"
            : "Добавить в мой словарь"}
    </button>
  );
}
