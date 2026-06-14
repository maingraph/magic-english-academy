"use client";

import { useEffect, useMemo, useState } from "react";

type LessonBlockType = "RICH_TEXT" | "EXAMPLE" | "MEDIA" | "TASK" | "DICTIONARY_TERM";

type BlockContent = Record<string, string | string[]>;

type EditableBlock = {
  id?: string;
  type: LessonBlockType;
  orderIndex: number;
  content: BlockContent;
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
  blocks: Array<{
    id?: string;
    type: LessonBlockType;
    orderIndex: number;
    content: unknown;
  }>;
};

const blockTypes: Array<{ value: LessonBlockType; label: string }> = [
  { value: "RICH_TEXT", label: "Текст" },
  { value: "EXAMPLE", label: "Примеры" },
  { value: "TASK", label: "Задание" },
  { value: "DICTIONARY_TERM", label: "Словарь" },
  { value: "MEDIA", label: "Медиа" }
];

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

const adminHeaders = {
  "content-type": "application/json"
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeContent(type: LessonBlockType, content: unknown): BlockContent {
  const source = isRecord(content) ? content : {};

  if (type === "EXAMPLE") {
    return {
      title: asString(source.title),
      items: asStringArray(source.items)
    };
  }

  if (type === "TASK") {
    return {
      title: asString(source.title),
      prompt: asString(source.prompt),
      options: asStringArray(source.options),
      answer: asString(source.answer)
    };
  }

  if (type === "DICTIONARY_TERM") {
    return {
      term: asString(source.term),
      translation: asString(source.translation),
      definition: asString(source.definition),
      examples: asStringArray(source.examples)
    };
  }

  if (type === "MEDIA") {
    return {
      title: asString(source.title),
      url: asString(source.url),
      caption: asString(source.caption),
      mediaType: asString(source.mediaType) || "link"
    };
  }

  return {
    heading: asString(source.heading) || asString(source.title),
    text: asString(source.text) || asString(source.kind)
  };
}

function newBlockContent(type: LessonBlockType): BlockContent {
  if (type === "EXAMPLE") {
    return { title: "Примеры", items: ["I am ready.", "She is happy."] };
  }

  if (type === "TASK") {
    return {
      title: "Мини-практика",
      prompt: "Выбери правильный вариант.",
      options: ["am", "is", "are"],
      answer: "is"
    };
  }

  if (type === "DICTIONARY_TERM") {
    return {
      term: "word",
      translation: "перевод",
      definition: "Короткое объяснение.",
      examples: ["Use this word in a sentence."]
    };
  }

  if (type === "MEDIA") {
    return {
      title: "Материал",
      url: "https://",
      caption: "Описание ссылки или видео.",
      mediaType: "link"
    };
  }

  return {
    heading: "Новый блок",
    text: "Текст блока..."
  };
}

function emptyBlock(type: LessonBlockType = "RICH_TEXT"): EditableBlock {
  return {
    type,
    orderIndex: 1,
    content: newBlockContent(type)
  };
}

function linesToText(value: string | string[] | undefined) {
  return Array.isArray(value) ? value.join("\n") : "";
}

function textToLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseSourceToBlocks(source: string): EditableBlock[] {
  const chunks = source
    .split(/\n\s*\n/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const parsed = chunks.map((chunk, index): EditableBlock => {
    const lines = chunk
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const firstLine = lines[0] ?? "Материал урока";
    const rest = lines.slice(1);
    const bulletItems = lines
      .filter((line) => /^[-*•]\s+/.test(line))
      .map((line) => line.replace(/^[-*•]\s+/, "").trim());

    if (bulletItems.length >= 2) {
      return {
        type: "EXAMPLE",
        orderIndex: index + 1,
        content: {
          title: firstLine.replace(/^#+\s*/, ""),
          items: bulletItems
        }
      };
    }

    if (chunk.includes("?")) {
      return {
        type: "TASK",
        orderIndex: index + 1,
        content: {
          title: "Практика",
          prompt: chunk,
          options: [],
          answer: ""
        }
      };
    }

    return {
      type: "RICH_TEXT",
      orderIndex: index + 1,
      content: {
        heading: firstLine.replace(/^#+\s*/, ""),
        text: rest.length > 0 ? rest.join("\n") : chunk
      }
    };
  });

  return parsed.length > 0 ? parsed : [emptyBlock()];
}

export function AdminLessonEditor({ selectedSlug }: { selectedSlug: string | null }) {
  const [lesson, setLesson] = useState<EditableLesson | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [blocks, setBlocks] = useState<EditableBlock[]>([]);
  const [sourceText, setSourceText] = useState("");
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
          credentials: "include",
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
            id: block.id,
            type: block.type,
            orderIndex: block.orderIndex,
            content: normalizeContent(block.type, block.content)
          }))
        );
        setSourceText("");
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

  function updateBlock(index: number, patch: Partial<EditableBlock>) {
    setBlocks((current) =>
      current.map((block, blockIndex) =>
        blockIndex === index ? { ...block, ...patch } : block
      )
    );
  }

  function updateBlockContent(index: number, key: string, value: string | string[]) {
    setBlocks((current) =>
      current.map((block, blockIndex) =>
        blockIndex === index
          ? { ...block, content: { ...block.content, [key]: value } }
          : block
      )
    );
  }

  function changeBlockType(index: number, type: LessonBlockType) {
    updateBlock(index, {
      type,
      content: newBlockContent(type)
    });
  }

  function addBlock(type: LessonBlockType = "RICH_TEXT") {
    setBlocks((current) => [
      ...current,
      {
        ...emptyBlock(type),
        orderIndex: current.length + 1
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

  function replaceFromSource() {
    const nextBlocks = parseSourceToBlocks(sourceText);
    setBlocks(nextBlocks);
    setMessage(`Черновик собран: ${nextBlocks.length} блоков.`);
  }

  function appendFromSource() {
    const nextBlocks = parseSourceToBlocks(sourceText);
    setBlocks((current) => [
      ...current,
      ...nextBlocks.map((block, index) => ({
        ...block,
        orderIndex: current.length + index + 1
      }))
    ]);
    setMessage(`Добавлено блоков: ${nextBlocks.length}.`);
  }

  async function saveLesson() {
    if (!lesson) {
      return;
    }

    try {
      setStatus("saving");
      setMessage("Сохраняем...");

      const response = await fetch(`${apiBaseUrl}/admin/lessons/${lesson.slug}`, {
        method: "PATCH",
        credentials: "include",
        headers: adminHeaders,
        body: JSON.stringify({
          title,
          summary,
          blocks: blocks.map((block, index) => ({
            type: block.type,
            orderIndex: index + 1,
            content: block.content
          }))
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
          id: block.id,
          type: block.type,
          orderIndex: block.orderIndex,
          content: normalizeContent(block.type, block.content)
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

          <div className="migration-box">
            <div>
              <span className="admin-kicker">Миграция материала</span>
              <h3>Вставка из Notion или документа</h3>
            </div>
            <textarea
              rows={6}
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              placeholder={"Заголовок\nТекст блока...\n\nПримеры\n- I am ready.\n- She is happy."}
            />
            <div className="migration-actions">
              <button type="button" onClick={replaceFromSource} disabled={!sourceText.trim()}>
                Заменить блоки
              </button>
              <button type="button" onClick={appendFromSource} disabled={!sourceText.trim()}>
                Добавить в конец
              </button>
            </div>
          </div>

          <div className="editor-block-toolbar">
            <span>Блоки урока</span>
            <button type="button" onClick={() => addBlock()}>
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
                      changeBlockType(index, event.target.value as LessonBlockType)
                    }
                  >
                    {blockTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
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
                <BlockFields
                  block={block}
                  index={index}
                  onContentChange={updateBlockContent}
                />
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

function BlockFields({
  block,
  index,
  onContentChange
}: {
  block: EditableBlock;
  index: number;
  onContentChange: (index: number, key: string, value: string | string[]) => void;
}) {
  if (block.type === "EXAMPLE") {
    return (
      <>
        <TextField
          label="Заголовок"
          value={asString(block.content.title)}
          onChange={(value) => onContentChange(index, "title", value)}
        />
        <TextAreaField
          label="Список примеров"
          value={linesToText(block.content.items)}
          rows={5}
          onChange={(value) => onContentChange(index, "items", textToLines(value))}
        />
      </>
    );
  }

  if (block.type === "TASK") {
    return (
      <>
        <TextField
          label="Название задания"
          value={asString(block.content.title)}
          onChange={(value) => onContentChange(index, "title", value)}
        />
        <TextAreaField
          label="Вопрос"
          value={asString(block.content.prompt)}
          rows={3}
          onChange={(value) => onContentChange(index, "prompt", value)}
        />
        <TextAreaField
          label="Варианты ответа"
          value={linesToText(block.content.options)}
          rows={4}
          onChange={(value) => onContentChange(index, "options", textToLines(value))}
        />
        <TextField
          label="Правильный ответ"
          value={asString(block.content.answer)}
          onChange={(value) => onContentChange(index, "answer", value)}
        />
      </>
    );
  }

  if (block.type === "DICTIONARY_TERM") {
    return (
      <>
        <TextField
          label="Слово или фраза"
          value={asString(block.content.term)}
          onChange={(value) => onContentChange(index, "term", value)}
        />
        <TextField
          label="Перевод"
          value={asString(block.content.translation)}
          onChange={(value) => onContentChange(index, "translation", value)}
        />
        <TextAreaField
          label="Объяснение"
          value={asString(block.content.definition)}
          rows={3}
          onChange={(value) => onContentChange(index, "definition", value)}
        />
        <TextAreaField
          label="Примеры"
          value={linesToText(block.content.examples)}
          rows={4}
          onChange={(value) => onContentChange(index, "examples", textToLines(value))}
        />
      </>
    );
  }

  if (block.type === "MEDIA") {
    return (
      <>
        <TextField
          label="Название"
          value={asString(block.content.title)}
          onChange={(value) => onContentChange(index, "title", value)}
        />
        <TextField
          label="Ссылка"
          value={asString(block.content.url)}
          onChange={(value) => onContentChange(index, "url", value)}
        />
        <TextAreaField
          label="Подпись"
          value={asString(block.content.caption)}
          rows={3}
          onChange={(value) => onContentChange(index, "caption", value)}
        />
      </>
    );
  }

  return (
    <>
      <TextField
        label="Заголовок"
        value={asString(block.content.heading)}
        onChange={(value) => onContentChange(index, "heading", value)}
      />
      <TextAreaField
        label="Текст"
        value={asString(block.content.text)}
        rows={6}
        onChange={(value) => onContentChange(index, "text", value)}
      />
    </>
  );
}

function TextField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="editor-field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  rows,
  onChange
}: {
  label: string;
  value: string;
  rows: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="editor-field">
      <span>{label}</span>
      <textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
