"use client";

import { useEffect, useMemo, useState } from "react";

type LessonBlockType = "RICH_TEXT" | "EXAMPLE" | "MEDIA" | "TASK" | "DICTIONARY_TERM";

type EditableBlock = {
  id?: string;
  type: LessonBlockType;
  orderIndex: number;
  content: unknown;
};

type EditableLesson = {
  slug: string;
  title: string;
  summary: string | null;
  level: {
    code: string;
    title: string;
  };
  module: {
    title: string;
    orderIndex: number;
  };
  blocks: EditableBlock[];
};

const blockTypes: LessonBlockType[] = [
  "RICH_TEXT",
  "EXAMPLE",
  "MEDIA",
  "TASK",
  "DICTIONARY_TERM"
];

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

const adminHeaders = {
  "content-type": "application/json",
  "x-user-role": "admin",
  "x-user-email": "admin@magic.local",
  "x-user-name": "Admin"
};

function formatJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function emptyBlock(): EditableBlock {
  return {
    type: "RICH_TEXT",
    orderIndex: 1,
    content: {
      heading: "Новый блок",
      text: "Текст блока..."
    }
  };
}

export function AdminLessonEditor({ selectedSlug }: { selectedSlug: string | null }) {
  const [lesson, setLesson] = useState<EditableLesson | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [blocks, setBlocks] = useState<Array<EditableBlock & { contentJson: string }>>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("Выберите урок из карты курса.");

  const selectedKey = selectedSlug ?? "";

  useEffect(() => {
    if (!selectedSlug) {
      setLesson(null);
      setStatus("idle");
      setMessage("Выберите урок из карты курса.");
      return;
    }

    const controller = new AbortController();

    async function loadLesson() {
      try {
        setStatus("loading");
        setMessage("Загружаем урок...");

        const response = await fetch(`${apiBaseUrl}/admin/lessons/${selectedSlug}`, {
          headers: adminHeaders,
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Lesson load failed: ${response.status}`);
        }

        const nextLesson = (await response.json()) as EditableLesson;
        setLesson(nextLesson);
        setTitle(nextLesson.title);
        setSummary(nextLesson.summary ?? "");
        setBlocks(
          nextLesson.blocks.map((block) => ({
            ...block,
            contentJson: formatJson(block.content)
          }))
        );
        setStatus("idle");
        setMessage("Урок готов к редактированию.");
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error);
          setStatus("error");
          setMessage("Не удалось загрузить урок. Проверьте API.");
        }
      }
    }

    void loadLesson();

    return () => controller.abort();
  }, [selectedKey, selectedSlug]);

  const blockCountLabel = useMemo(() => {
    if (blocks.length === 1) {
      return "1 блок";
    }

    return `${blocks.length} блоков`;
  }, [blocks.length]);

  function updateBlock(index: number, patch: Partial<EditableBlock & { contentJson: string }>) {
    setBlocks((current) =>
      current.map((block, blockIndex) =>
        blockIndex === index ? { ...block, ...patch } : block
      )
    );
  }

  function addBlock() {
    setBlocks((current) => [
      ...current,
      {
        ...emptyBlock(),
        orderIndex: current.length + 1,
        contentJson: formatJson(emptyBlock().content)
      }
    ]);
  }

  function removeBlock(index: number) {
    setBlocks((current) =>
      current
        .filter((_, blockIndex) => blockIndex !== index)
        .map((block, blockIndex) => ({ ...block, orderIndex: blockIndex + 1 }))
    );
  }

  async function saveLesson() {
    if (!lesson) {
      return;
    }

    try {
      setStatus("saving");
      setMessage("Сохраняем...");

      const parsedBlocks = blocks.map((block, index) => {
        let content: unknown;

        try {
          content = JSON.parse(block.contentJson);
        } catch {
          throw new Error(`JSON ошибка в блоке ${index + 1}`);
        }

        return {
          type: block.type,
          orderIndex: index + 1,
          content
        };
      });

      const response = await fetch(`${apiBaseUrl}/admin/lessons/${lesson.slug}`, {
        method: "PATCH",
        headers: adminHeaders,
        body: JSON.stringify({
          title,
          summary,
          blocks: parsedBlocks
        })
      });

      if (!response.ok) {
        throw new Error(`Lesson save failed: ${response.status}`);
      }

      const savedLesson = (await response.json()) as EditableLesson;
      setLesson(savedLesson);
      setTitle(savedLesson.title);
      setSummary(savedLesson.summary ?? "");
      setBlocks(
        savedLesson.blocks.map((block) => ({
          ...block,
          contentJson: formatJson(block.content)
        }))
      );
      setStatus("saved");
      setMessage("Сохранено в базе.");
    } catch (error) {
      console.error(error);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить урок.");
    }
  }

  return (
    <section className="soft-card admin-lesson-editor" id="lesson-editor">
      <div className="admin-section-header">
        <div>
          <span className="admin-kicker">Редактор урока</span>
          <h2>{lesson ? lesson.title : "Выберите урок"}</h2>
          <p>{lesson ? `${lesson.level.code} / ${lesson.module.title}` : message}</p>
        </div>
        <div className={`editor-status ${status}`}>
          <strong>{lesson ? blockCountLabel : "Нет урока"}</strong>
          <span>{message}</span>
        </div>
      </div>

      {lesson ? (
        <div className="lesson-editor-form">
          <label className="editor-field">
            <span>Название</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Название урока"
            />
          </label>

          <label className="editor-field">
            <span>Краткое описание</span>
            <textarea
              rows={3}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Описание для списка уроков и hero-блока"
            />
          </label>

          <div className="editor-block-toolbar">
            <span>Блоки урока</span>
            <button type="button" onClick={addBlock}>
              Добавить блок
            </button>
          </div>

          <div className="editor-block-list">
            {blocks.map((block, index) => (
              <article className="editor-block-row" key={`${block.id ?? "new"}-${index}`}>
                <div className="editor-block-head">
                  <strong>Блок {index + 1}</strong>
                  <select
                    value={block.type}
                    onChange={(event) =>
                      updateBlock(index, { type: event.target.value as LessonBlockType })
                    }
                  >
                    {blockTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeBlock(index)}
                    disabled={blocks.length === 1}
                  >
                    Удалить
                  </button>
                </div>
                <label className="editor-field">
                  <span>JSON content</span>
                  <textarea
                    rows={8}
                    value={block.contentJson}
                    onChange={(event) =>
                      updateBlock(index, { contentJson: event.target.value })
                    }
                    spellCheck={false}
                  />
                </label>
              </article>
            ))}
          </div>

          <div className="editor-actions">
            <a className="editor-preview-link" href={`/courses/${lesson.level.code.toLowerCase()}/lessons/${lesson.slug}`}>
              Открыть урок
            </a>
            <button type="button" onClick={saveLesson} disabled={status === "saving"}>
              {status === "saving" ? "Сохраняем..." : "Сохранить урок"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
