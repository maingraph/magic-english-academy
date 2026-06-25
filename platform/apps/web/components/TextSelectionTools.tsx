"use client";

import { BookmarkPlus, Bot } from "lucide-react";
import { useEffect, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export function TextSelectionTools({ lessonSlug }: { lessonSlug: string }) {
  const [selection, setSelection] = useState<{
    text: string;
    left: number;
    top: number;
  } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    function readSelection() {
      const current = window.getSelection();
      const text = current?.toString().trim() ?? "";

      if (!current || text.length < 2 || text.length > 80 || current.rangeCount === 0) {
        setSelection(null);
        return;
      }

      const range = current.getRangeAt(0);
      const element = range.commonAncestorContainer.parentElement;

      if (!element?.closest(".lesson-content")) {
        setSelection(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      setSaved(false);
      setSelection({
        text,
        left: Math.min(Math.max(rect.left + rect.width / 2, 120), window.innerWidth - 120),
        top: Math.max(rect.top - 48, 74)
      });
    }

    document.addEventListener("mouseup", readSelection);
    document.addEventListener("touchend", readSelection);
    return () => {
      document.removeEventListener("mouseup", readSelection);
      document.removeEventListener("touchend", readSelection);
    };
  }, []);

  async function saveWord() {
    if (!selection) return;
    const response = await fetch(`${apiBaseUrl}/dictionary/quick-save`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        term: selection.text,
        lessonSlug
      })
    });

    if (response.ok) setSaved(true);
  }

  function explain() {
    if (!selection) return;
    window.dispatchEvent(
      new CustomEvent("magic-assistant:explain", {
        detail: { text: selection.text, lessonSlug }
      })
    );
    setSelection(null);
  }

  if (!selection) return null;

  return (
    <div
      className="selection-tools"
      style={{ left: selection.left, top: selection.top }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <button onClick={saveWord} type="button">
        <BookmarkPlus size={15} />
        {saved ? "Сохранено" : "Сохранить"}
      </button>
      <button onClick={explain} type="button">
        <Bot size={15} />
        Объяснить
      </button>
    </div>
  );
}
