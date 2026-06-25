"use client";

import { FilePlus2, Save } from "lucide-react";
import { useEffect, useState } from "react";

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: unknown;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  updatedAt: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const statusLabels = {
  DRAFT: "Черновик",
  PUBLISHED: "Опубликовано",
  ARCHIVED: "В архиве"
} as const;

function articleText(content: unknown) {
  if (
    content &&
    typeof content === "object" &&
    !Array.isArray(content) &&
    "text" in content &&
    typeof content.text === "string"
  ) {
    return content.text;
  }

  return "";
}

export function AdminArticlePanel() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [text, setText] = useState("");
  const [articleStatus, setArticleStatus] = useState<Article["status"]>("DRAFT");
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">(
    "loading"
  );

  useEffect(() => {
    void loadArticles();
  }, []);

  async function loadArticles() {
    const response = await fetch(`${apiBaseUrl}/admin/articles`, {
      credentials: "include"
    });

    if (response.ok) {
      const data = (await response.json()) as Article[];
      setArticles(data);
      setStatus("ready");
    } else {
      setStatus("error");
    }
  }

  function selectArticle(article: Article) {
    setSelectedId(article.id);
    setTitle(article.title);
    setSlug(article.slug);
    setExcerpt(article.excerpt ?? "");
    setText(articleText(article.content));
    setArticleStatus(article.status);
  }

  function newArticle() {
    setSelectedId(null);
    setTitle("");
    setSlug("");
    setExcerpt("");
    setText("");
    setArticleStatus("DRAFT");
  }

  async function saveArticle() {
    setStatus("saving");
    const response = await fetch(
      selectedId
        ? `${apiBaseUrl}/admin/articles/${selectedId}`
        : `${apiBaseUrl}/admin/articles`,
      {
        method: selectedId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          slug: slug || undefined,
          excerpt,
          content: { type: "rich_text", text },
          status: articleStatus
        })
      }
    );

    if (response.ok) {
      const saved = (await response.json()) as Article;
      setSelectedId(saved.id);
      await loadArticles();
      setStatus("ready");
    } else {
      setStatus("error");
    }
  }

  return (
    <div className="admin-split-workspace">
      <aside className="admin-list-panel">
        <div className="panel-heading">
          <div>
            <span>Материалы</span>
            <h2>Статьи</h2>
          </div>
          <button onClick={newArticle} type="button" title="Новая статья">
            <FilePlus2 size={17} />
          </button>
        </div>
        <div className="admin-record-list">
          {articles.map((article) => (
            <button
              className={selectedId === article.id ? "active" : ""}
              key={article.id}
              onClick={() => selectArticle(article)}
              type="button"
            >
              <strong>{article.title}</strong>
              <span>{statusLabels[article.status]} · /{article.slug}</span>
            </button>
          ))}
          {articles.length === 0 ? <p>Статей пока нет.</p> : null}
        </div>
      </aside>

      <section className="workspace-panel admin-editor-panel">
        <div className="panel-heading">
          <div>
            <span>{selectedId ? "Редактирование статьи" : "Новая статья"}</span>
            <h2>{title || "Статья без названия"}</h2>
          </div>
          <button disabled={status === "saving" || !title.trim()} onClick={saveArticle} type="button">
            <Save size={17} />
            {status === "saving" ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
        <div className="form-grid">
          <label>
            Заголовок
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            Адрес страницы
            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="создаётся-из-заголовка"
            />
          </label>
          <label className="span-two">
            Краткое описание
            <textarea
              rows={3}
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
            />
          </label>
          <label className="span-two">
            Текст статьи
            <textarea
              rows={18}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <label>
            Статус публикации
            <select
              value={articleStatus}
              onChange={(event) => setArticleStatus(event.target.value as Article["status"])}
            >
              <option value="DRAFT">Черновик</option>
              <option value="PUBLISHED">Опубликовано</option>
              <option value="ARCHIVED">В архиве</option>
            </select>
          </label>
        </div>
      </section>
    </div>
  );
}
