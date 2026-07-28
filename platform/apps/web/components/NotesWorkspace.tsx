"use client";

import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Pencil,
  Pin,
  Plus,
  Save,
  Search,
  Trash2,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Note = {
  id: string;
  title: string;
  text: string;
  color: "cream" | "white" | "orange";
  pinned: boolean;
  updatedAt: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

function formatUpdatedAt(value: string) {
  return new Intl.RelativeTimeFormat("ru", { numeric: "auto" }).format(
    Math.max(-30, Math.round((new Date(value).getTime() - Date.now()) / 86_400_000)),
    "day"
  );
}

export function NotesWorkspace() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "error">("loading");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [color, setColor] = useState<Note["color"]>("cream");

  useEffect(() => {
    fetch(`${apiBaseUrl}/notes`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Не удалось загрузить заметки");
        const data = (await response.json()) as { notes: Note[] };
        setNotes(data.notes);
        setStatus("idle");
      })
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : "Заметки временно недоступны");
        setStatus("error");
      });
  }, []);

  const filteredNotes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return notes;
    return notes.filter((note) =>
      `${note.title} ${note.text}`.toLowerCase().includes(normalized)
    );
  }, [notes, query]);

  function openEditor(note?: Note) {
    setEditingId(note?.id ?? null);
    setTitle(note?.title ?? "");
    setText(note?.text ?? "");
    setColor(note?.color ?? "cream");
    setEditorOpen(true);
  }

  async function saveNote(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !text.trim()) return;
    setStatus("saving");
    try {
      const response = await fetch(
        editingId ? `${apiBaseUrl}/notes/${editingId}` : `${apiBaseUrl}/notes`,
        {
          method: editingId ? "PATCH" : "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: title.trim(), text: text.trim(), color })
        }
      );
      if (!response.ok) throw new Error("Не удалось сохранить заметку");
      const saved = (await response.json()) as Note;
      setNotes((current) =>
        editingId
          ? current.map((note) => (note.id === editingId ? saved : note))
          : [...current, saved]
      );
      setEditorOpen(false);
      setStatus("idle");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Заметка не сохранена");
      setStatus("error");
    }
  }

  async function persistOrder(next: Note[]) {
    try {
      const response = await fetch(`${apiBaseUrl}/notes/reorder`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: next.map((note) => note.id) })
      });
      if (!response.ok) throw new Error("Новый порядок не сохранён");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Новый порядок не сохранён");
    }
  }

  function moveNote(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    const sourceIndex = notes.findIndex((note) => note.id === sourceId);
    const targetIndex = notes.findIndex((note) => note.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const next = [...notes];
    const [source] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, source);
    setNotes(next);
    void persistOrder(next);
  }

  function nudgeNote(id: string, offset: -1 | 1) {
    const index = notes.findIndex((note) => note.id === id);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= notes.length) return;
    const next = [...notes];
    [next[index], next[target]] = [next[target], next[index]];
    setNotes(next);
    void persistOrder(next);
  }

  async function patchNote(noteId: string, patch: Record<string, unknown>) {
    const response = await fetch(`${apiBaseUrl}/notes/${noteId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch)
    });
    if (!response.ok) {
      setError("Не удалось обновить заметку");
      return;
    }
    const saved = (await response.json()) as Note;
    setNotes((current) => current.map((note) => (note.id === noteId ? saved : note)));
  }

  async function removeNote(noteId: string) {
    const response = await fetch(`${apiBaseUrl}/notes/${noteId}`, {
      method: "DELETE",
      credentials: "include"
    });
    if (!response.ok) {
      setError("Не удалось удалить заметку");
      return;
    }
    setNotes((current) => current.filter((note) => note.id !== noteId));
  }

  return (
    <div className="notes-workspace">
      <header className="workspace-page-heading">
        <div>
          <span>Личный конспект</span>
          <h1>Твои заметки</h1>
          <p>Перетаскивай карточки, закрепляй важное и открывай заметки рядом с уроком.</p>
        </div>
        <button onClick={() => openEditor()} type="button">
          <Plus size={18} />
          Новая заметка
        </button>
      </header>

      <label className="notes-search">
        <Search size={19} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Найти заметку"
        />
        <span>{filteredNotes.length}</span>
      </label>

      {error ? <p className="workspace-error" role="alert">{error}</p> : null}
      {status === "loading" ? <p className="workspace-empty">Загружаем заметки…</p> : null}
      {status !== "loading" && filteredNotes.length === 0 ? (
        <p className="workspace-empty">Заметок пока нет. Создай первую карточку.</p>
      ) : null}

      <div className="notes-board">
        {filteredNotes.map((note, index) => (
          <article
            className={[
              "note-card",
              note.color,
              draggedId === note.id ? "is-dragging" : "",
              dragOverId === note.id ? "is-drag-over" : ""
            ].filter(Boolean).join(" ")}
            draggable
            key={note.id}
            onDragStart={(event) => {
              setDraggedId(note.id);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", note.id);
            }}
            onDragEnter={() => setDragOverId(note.id)}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={(event) => {
              event.preventDefault();
              const sourceId = event.dataTransfer.getData("text/plain");
              moveNote(sourceId, note.id);
              setDraggedId(null);
              setDragOverId(null);
            }}
            onDragEnd={() => {
              setDraggedId(null);
              setDragOverId(null);
            }}
          >
            <div className="note-card-top">
              <small>{note.pinned ? "закреплено" : formatUpdatedAt(note.updatedAt)}</small>
              <div>
                <span className="note-drag-handle" title="Перетащить">
                  <GripVertical size={19} />
                </span>
                <button
                  className={note.pinned ? "active" : ""}
                  onClick={() => void patchNote(note.id, { isPinned: !note.pinned })}
                  type="button"
                  aria-label={note.pinned ? "Открепить" : "Закрепить"}
                >
                  <Pin size={17} />
                </button>
                <button onClick={() => openEditor(note)} type="button" aria-label="Редактировать">
                  <Pencil size={17} />
                </button>
                <button
                  onClick={() => void removeNote(note.id)}
                  type="button"
                  aria-label="Удалить"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
            <button className="note-open" onClick={() => openEditor(note)} type="button">
              <h2>{note.title}</h2>
              <p>{note.text}</p>
              <span>Открыть и дописать</span>
            </button>
            <div className="note-mobile-order" aria-label="Изменить порядок">
              <button
                disabled={index === 0}
                onClick={() => nudgeNote(note.id, -1)}
                type="button"
                aria-label="Переместить выше"
              >
                <ArrowUp size={16} />
              </button>
              <button
                disabled={index === filteredNotes.length - 1}
                onClick={() => nudgeNote(note.id, 1)}
                type="button"
                aria-label="Переместить ниже"
              >
                <ArrowDown size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>

      {editorOpen ? (
        <div className="note-editor-backdrop" onMouseDown={() => setEditorOpen(false)}>
          <form
            className="note-editor"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => void saveNote(event)}
          >
            <header>
              <div>
                <span>{editingId ? "Редактирование" : "Новая заметка"}</span>
                <h2>{editingId ? "Можно дописать" : "Запиши, пока не забыл"}</h2>
              </div>
              <button onClick={() => setEditorOpen(false)} type="button" aria-label="Закрыть">
                <X size={20} />
              </button>
            </header>
            <label>
              Название
              <input value={title} onChange={(event) => setTitle(event.target.value)} required />
            </label>
            <label>
              Текст
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={8}
                required
              />
            </label>
            <div className="note-color-picker">
              <span>Цвет</span>
              {(["cream", "white", "orange"] as const).map((item) => (
                <button
                  className={`${item} ${color === item ? "active" : ""}`}
                  key={item}
                  onClick={() => setColor(item)}
                  type="button"
                  aria-label={`Цвет ${item}`}
                />
              ))}
            </div>
            <button className="note-save" disabled={status === "saving"} type="submit">
              <Save size={18} />
              {status === "saving" ? "Сохраняем…" : "Сохранить"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
