"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

type Submission = {
  id: string;
  student: {
    displayName: string;
    email: string;
  };
  lesson: {
    title: string;
  } | null;
  content: unknown;
  score: number | null;
  feedback: string | null;
  status: "pending" | "reviewed";
  submittedAt: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const statusLabel = (status: Submission["status"]) =>
  status === "reviewed" ? "Проверено" : "Ожидает проверки";

function submissionText(content: unknown) {
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

export function AdminHomeworkPanel() {
  const [items, setItems] = useState<Submission[]>([]);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [score, setScore] = useState(80);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const response = await fetch(`${apiBaseUrl}/admin/homework`, {
      credentials: "include"
    });
    if (response.ok) {
      const data = (await response.json()) as Submission[];
      setItems(data);
      setSelected((current) => current ?? data[0] ?? null);
    }
  }

  function choose(item: Submission) {
    setSelected(item);
    setScore(item.score ?? 80);
    setFeedback(item.feedback ?? "");
  }

  async function review() {
    if (!selected) return;
    const response = await fetch(`${apiBaseUrl}/admin/homework/${selected.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ score, feedback })
    });

    if (response.ok) {
      await load();
    }
  }

  return (
    <div className="admin-split-workspace">
      <aside className="admin-list-panel">
        <div className="panel-heading">
          <div>
            <span>Очередь проверки</span>
            <h2>Домашние работы</h2>
          </div>
        </div>
        <div className="admin-record-list">
          {items.map((item) => (
            <button
              className={selected?.id === item.id ? "active" : ""}
              key={item.id}
              onClick={() => choose(item)}
              type="button"
            >
              <strong>{item.student.displayName}</strong>
              <span>{item.lesson?.title ?? "Урок"} · {statusLabel(item.status)}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="workspace-panel admin-editor-panel">
        {selected ? (
          <>
            <div className="panel-heading">
              <div>
                <span>{selected.student.email}</span>
                <h2>{selected.lesson?.title ?? "Домашняя работа"}</h2>
              </div>
              <span className={`status-label ${selected.status}`}>{statusLabel(selected.status)}</span>
            </div>
            <div className="submission-answer">{submissionText(selected.content)}</div>
            <div className="review-form">
              <label>
                Оценка
                <input
                  max={100}
                  min={0}
                  onChange={(event) => setScore(Number(event.target.value))}
                  type="number"
                  value={score}
                />
              </label>
              <label>
                Комментарий преподавателя
                <textarea
                  rows={7}
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  placeholder="Конкретное исправление и следующий шаг"
                />
              </label>
              <button disabled={feedback.trim().length < 3} onClick={review} type="button">
                <CheckCircle2 size={17} />
                Сохранить проверку
              </button>
            </div>
          </>
        ) : (
          <div className="workspace-empty">
            <CheckCircle2 size={30} />
            <h3>Очередь пуста</h3>
          </div>
        )}
      </section>
    </div>
  );
}
