"use client";

import { ClipboardCheck } from "lucide-react";
import { useEffect, useState } from "react";

type Homework = {
  id: string;
  lesson: { slug: string; title: string } | null;
  score: number | null;
  feedback: string | null;
  status: "pending" | "reviewed";
  submittedAt: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export function HomeworkPanel() {
  const [items, setItems] = useState<Homework[]>([]);

  useEffect(() => {
    fetch(`${apiBaseUrl}/learning/homework`, { credentials: "include" })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setItems(data as Homework[]))
      .catch(() => setItems([]));
  }, []);

  return (
    <section className="workspace-panel">
      <div className="panel-heading">
        <div>
          <span>Обратная связь преподавателя</span>
          <h2>Домашние работы</h2>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="workspace-empty compact">
          <ClipboardCheck size={28} />
          <h3>Отправленных работ пока нет</h3>
          <p>Формы домашних работ находятся внутри уроков.</p>
        </div>
      ) : (
        <div className="homework-list">
          {items.map((item) => (
            <article key={item.id}>
              <div>
                <strong>{item.lesson?.title ?? "Урок"}</strong>
                <small>{new Date(item.submittedAt).toLocaleDateString("ru-RU")}</small>
              </div>
              <span className={`status-label ${item.status}`}>
                {item.status === "reviewed" ? "Проверено" : "На проверке"}
              </span>
              <strong>{item.score === null ? "—" : `${item.score}/100`}</strong>
              <p>{item.feedback ?? "Ожидает проверки преподавателем."}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
