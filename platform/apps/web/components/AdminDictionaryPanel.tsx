"use client";

import { FormEvent, useEffect, useState } from "react";

type DictionaryTerm = {
  id: string;
  term: string;
  translation: string | null;
  definition: string | null;
  examples: unknown;
};

type DictionaryResponse = {
  total: number;
  terms: DictionaryTerm[];
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

const adminHeaders = {
  "content-type": "application/json"
};

function getExamples(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function AdminDictionaryPanel() {
  const [terms, setTerms] = useState<DictionaryTerm[]>([]);
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  const [translation, setTranslation] = useState("");
  const [definition, setDefinition] = useState("");
  const [examples, setExamples] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [message, setMessage] = useState("Загружаем словарь...");

  async function loadDictionary(search = query) {
    try {
      setStatus("loading");
      const params = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
      const response = await fetch(`${apiBaseUrl}/admin/dictionary${params}`, {
        credentials: "include",
        headers: adminHeaders
      });

      if (!response.ok) {
        throw new Error(`Dictionary load failed: ${response.status}`);
      }

      const data = (await response.json()) as DictionaryResponse;
      setTerms(data.terms);
      setStatus("ready");
      setMessage(`${data.total} терминов в выборке.`);
    } catch (error) {
      console.error(error);
      setStatus("error");
      setMessage("Не удалось загрузить словарь.");
    }
  }

  useEffect(() => {
    void loadDictionary("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createTerm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setStatus("saving");
      setMessage("Сохраняем термин...");

      const response = await fetch(`${apiBaseUrl}/admin/dictionary`, {
        method: "POST",
        credentials: "include",
        headers: adminHeaders,
        body: JSON.stringify({
          term,
          translation,
          definition,
          examples: examples
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
        })
      });

      if (!response.ok) {
        throw new Error(`Dictionary save failed: ${response.status}`);
      }

      setTerm("");
      setTranslation("");
      setDefinition("");
      setExamples("");
      await loadDictionary(query);
      setMessage("Термин добавлен в словарь.");
    } catch (error) {
      console.error(error);
      setStatus("error");
      setMessage("Не удалось сохранить термин.");
    }
  }

  return (
    <section className="soft-card admin-dictionary-panel">
      <div className="admin-section-header">
        <div>
          <span className="admin-kicker">Словарь</span>
          <h2>Термины курса</h2>
          <p>База слов и фраз для уроков, заданий и будущего личного словарика.</p>
        </div>
        <div className={`editor-status ${status}`}>
          <strong>{terms.length}</strong>
          <span>{message}</span>
        </div>
      </div>

      <div className="dictionary-layout">
        <form className="dictionary-form" onSubmit={createTerm}>
          <label className="editor-field">
            <span>Термин</span>
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="to be"
              required
            />
          </label>
          <label className="editor-field">
            <span>Перевод</span>
            <input
              value={translation}
              onChange={(event) => setTranslation(event.target.value)}
              placeholder="быть, являться"
            />
          </label>
          <label className="editor-field">
            <span>Объяснение</span>
            <textarea
              rows={3}
              value={definition}
              onChange={(event) => setDefinition(event.target.value)}
              placeholder="Короткое объяснение для ученика"
            />
          </label>
          <label className="editor-field">
            <span>Примеры</span>
            <textarea
              rows={4}
              value={examples}
              onChange={(event) => setExamples(event.target.value)}
              placeholder={"I am a student.\nShe is ready."}
            />
          </label>
          <button type="submit" disabled={status === "saving"}>
            {status === "saving" ? "Сохраняем..." : "Добавить термин"}
          </button>
        </form>

        <div className="dictionary-results">
          <div className="dictionary-search">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по словарю"
            />
            <button type="button" onClick={() => loadDictionary(query)}>
              Найти
            </button>
          </div>

          <div className="dictionary-list">
            {terms.map((item) => (
              <article className="dictionary-term-card" key={item.id}>
                <h3>{item.term}</h3>
                <strong>{item.translation || "Без перевода"}</strong>
                <p>{item.definition || "Описание пока не добавлено."}</p>
                {getExamples(item.examples).length > 0 ? (
                  <ul>
                    {getExamples(item.examples).map((example) => (
                      <li key={example}>{example}</li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
