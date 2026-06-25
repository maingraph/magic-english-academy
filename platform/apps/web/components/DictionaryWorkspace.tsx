"use client";

import { Bookmark, BookmarkCheck, Search, Volume2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type DictionaryTerm = {
  id: string;
  term: string;
  translation: string | null;
  definition: string | null;
  examples: unknown;
  saved: boolean;
  savedAt: string | null;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

function examples(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function DictionaryWorkspace() {
  const [terms, setTerms] = useState<DictionaryTerm[]>([]);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"all" | "mine">("mine");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (mode === "mine") params.set("mine", "true");

    try {
      const response = await fetch(`${apiBaseUrl}/dictionary?${params}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Dictionary unavailable");
      const data = (await response.json()) as { terms: DictionaryTerm[] };
      setTerms(data.terms);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [mode, query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleSaved(term: DictionaryTerm) {
    const response = await fetch(`${apiBaseUrl}/dictionary/${term.id}/save`, {
      method: term.saved ? "DELETE" : "POST",
      credentials: "include"
    });

    if (response.ok) {
      setTerms((current) =>
        current
          .map((item) => (item.id === term.id ? { ...item, saved: !item.saved } : item))
          .filter((item) => mode !== "mine" || item.saved)
      );
    }
  }

  function pronounce(term: string) {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(term);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  }

  return (
    <section className="workspace-panel">
      <div className="panel-heading dictionary-heading">
        <div>
          <span>Личный инструмент</span>
          <h2>{mode === "mine" ? "Мои сохраненные слова" : "Словарь курса"}</h2>
        </div>
        <div className="segmented-control">
          <button
            className={mode === "mine" ? "active" : ""}
            onClick={() => setMode("mine")}
            type="button"
          >
            Сохраненные
          </button>
          <button
            className={mode === "all" ? "active" : ""}
            onClick={() => setMode("all")}
            type="button"
          >
            Все термины
          </button>
        </div>
      </div>

      <div className="workspace-search">
        <Search size={18} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск слова, перевода или определения"
          aria-label="Поиск по словарю"
        />
      </div>

      {status === "loading" ? <div className="workspace-state">Загружаем словарь...</div> : null}
      {status === "error" ? <div className="workspace-state error">Словарь недоступен.</div> : null}
      {status === "ready" && terms.length === 0 ? (
        <div className="workspace-empty">
          <Bookmark size={30} />
          <h3>Здесь пока нет слов</h3>
          <p>Выделите текст в уроке и нажмите «Сохранить слово».</p>
        </div>
      ) : null}

      <div className="dictionary-table">
        {terms.map((term) => (
          <article key={term.id}>
            <div className="dictionary-word">
              <button
                className="icon-button"
                onClick={() => pronounce(term.term)}
                type="button"
                title="Произнести"
              >
                <Volume2 size={17} />
              </button>
              <div>
                <h3>{term.term}</h3>
                <strong>{term.translation ?? "Перевод пока не добавлен"}</strong>
              </div>
            </div>
            <div className="dictionary-definition">
              <p>{term.definition ?? "Определение пока не добавлено."}</p>
              {examples(term.examples)[0] ? <small>{examples(term.examples)[0]}</small> : null}
            </div>
            <button
              className={`save-term-button ${term.saved ? "saved" : ""}`}
              onClick={() => toggleSaved(term)}
              type="button"
              title={term.saved ? "Удалить из сохранённых слов" : "Сохранить слово"}
            >
              {term.saved ? <BookmarkCheck size={19} /> : <Bookmark size={19} />}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
