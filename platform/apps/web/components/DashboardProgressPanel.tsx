"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type LessonStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

type ProgressSummary = {
  currentLevel: string;
  totals: {
    lessons: number;
    completedLessons: number;
    inProgressLessons: number;
    percent: number;
  };
  levelProgress: Array<{
    code: string;
    title: string;
    totalLessons: number;
    completedLessons: number;
    inProgressLessons: number;
    percent: number;
  }>;
  nextLessons: Array<{
    slug: string;
    title: string;
    levelCode: string;
    moduleTitle: string;
    orderIndex: number;
    status: LessonStatus;
  }>;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

function statusLabel(status: LessonStatus) {
  if (status === "COMPLETED") {
    return "Готово";
  }

  if (status === "IN_PROGRESS") {
    return "В процессе";
  }

  return "Не начато";
}

export function DashboardProgressPanel() {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();

    async function loadSummary() {
      try {
        const response = await fetch(`${apiBaseUrl}/progress/summary`, {
          credentials: "include",
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Progress summary failed: ${response.status}`);
        }

        setSummary((await response.json()) as ProgressSummary);
        setStatus("ready");
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error);
          setStatus("error");
        }
      }
    }

    void loadSummary();

    return () => controller.abort();
  }, []);

  if (status === "loading") {
    return (
      <section className="soft-card api-status">
        <h2>Прогресс</h2>
        <p>Загружаем прогресс...</p>
      </section>
    );
  }

  if (status === "error" || !summary) {
    return (
      <section className="soft-card api-status warning">
        <h2>Прогресс</h2>
        <p>Прогресс сейчас недоступен. Проверьте API и базу данных.</p>
      </section>
    );
  }

  return (
    <>
      <section className="dashboard-grid">
        <article className="soft-card metric-card">
          <strong>{summary.currentLevel}</strong>
          <span>Текущий уровень</span>
        </article>
        <article className="soft-card metric-card">
          <strong>
            {summary.totals.completedLessons} / {summary.totals.lessons}
          </strong>
          <span>Уроки завершены</span>
        </article>
        <article className="soft-card metric-card">
          <strong>{summary.totals.inProgressLessons}</strong>
          <span>Уроки в процессе</span>
        </article>
      </section>

      <section className="soft-card">
        <h2>Прогресс по уровням</h2>
        {summary.levelProgress.map((level) => (
          <div className="progress-row" key={level.code}>
            <div className="progress-label">
              <span>
                {level.code} · {level.completedLessons}/{level.totalLessons}
              </span>
              <strong>{level.percent}%</strong>
            </div>
            <div className="progress-track">
              <span style={{ width: `${level.percent}%` }} />
            </div>
          </div>
        ))}
      </section>

      <section className="soft-card">
        <h2>Следующие уроки</h2>
        <div className="next-lesson-list">
          {summary.nextLessons.map((lesson) => (
            <Link
              className="next-lesson-row"
              href={`/courses/${lesson.levelCode.toLowerCase()}/lessons/${lesson.slug}`}
              key={lesson.slug}
            >
              <span className={`lesson-status-dot ${lesson.status.toLowerCase()}`} />
              <span>
                <strong>{lesson.title}</strong>
                <small>
                  {lesson.levelCode} · {lesson.moduleTitle} · {statusLabel(lesson.status)}
                </small>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
