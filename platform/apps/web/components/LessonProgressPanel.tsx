"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type LessonStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

type LessonProgressPanelProps = {
  slug: string;
  initialStatus: LessonStatus;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

function getStatusText(status: LessonStatus) {
  if (status === "COMPLETED") {
    return "Урок завершен";
  }

  if (status === "IN_PROGRESS") {
    return "Урок в процессе";
  }

  return "Урок не начат";
}

export function LessonProgressPanel({ slug, initialStatus }: LessonProgressPanelProps) {
  const router = useRouter();
  const [status, setStatus] = useState<LessonStatus>(initialStatus);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function startLesson() {
      if (initialStatus !== "NOT_STARTED") {
        return;
      }

      try {
        const response = await fetch(`${apiBaseUrl}/progress/lessons/${slug}/start`, {
          method: "POST",
          credentials: "include",
          signal: controller.signal
        });

        if (response.ok) {
          const progress = (await response.json()) as { status: LessonStatus };
          setStatus(progress.status);
          router.refresh();
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error);
        }
      }
    }

    void startLesson();

    return () => controller.abort();
  }, [initialStatus, router, slug]);

  async function completeLesson() {
    setIsSaving(true);

    try {
      const response = await fetch(`${apiBaseUrl}/progress/lessons/${slug}/complete`, {
        method: "POST",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`Lesson completion failed: ${response.status}`);
      }

      const progress = (await response.json()) as { status: LessonStatus };
      setStatus(progress.status);
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={`lesson-progress-card ${status.toLowerCase()}`}>
      <span className="admin-kicker">Статус</span>
      <h2>{getStatusText(status)}</h2>
      <p>
        Прогресс сохраняется в базе для dev-ученика. Скоро сюда добавим баллы,
        домашку и точность ответов.
      </p>
      <button
        className="lesson-complete-btn"
        disabled={status === "COMPLETED" || isSaving}
        onClick={completeLesson}
        type="button"
      >
        {status === "COMPLETED" ? "Готово" : isSaving ? "Сохраняем..." : "Завершить урок"}
      </button>
    </div>
  );
}
