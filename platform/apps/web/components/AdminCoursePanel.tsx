"use client";

import { useEffect, useState } from "react";

type AdminCourseMap = {
  source: string;
  course: {
    title: string;
    description: string | null;
    levels: Array<{
      code: string;
      title: string;
      lessonCount: number;
      modules: Array<{
        title: string;
        lessonCount: number;
        previewLessons: Array<{
          slug: string;
          title: string;
          summary: string | null;
          orderIndex: number;
        }>;
      }>;
    }>;
  } | null;
  totals: {
    levels: number;
    modules: number;
    lessons: number;
  };
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export function AdminCoursePanel() {
  const [courseMap, setCourseMap] = useState<AdminCourseMap | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();

    async function loadCourseMap() {
      try {
        const response = await fetch(`${apiBaseUrl}/admin/course-map`, {
          headers: {
            "x-user-role": "admin",
            "x-user-email": "admin@magic.local",
            "x-user-name": "Admin"
          },
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Admin course map failed: ${response.status}`);
        }

        setCourseMap((await response.json()) as AdminCourseMap);
        setStatus("ready");
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error);
          setStatus("error");
        }
      }
    }

    void loadCourseMap();

    return () => controller.abort();
  }, []);

  if (status === "loading") {
    return (
      <section className="soft-card admin-course-panel">
        <h2>Курс</h2>
        <p>Загружаем структуру курса...</p>
      </section>
    );
  }

  if (status === "error" || !courseMap?.course) {
    return (
      <section className="soft-card admin-course-panel api-status warning">
        <h2>Курс</h2>
        <p>Структура курса сейчас недоступна. Проверьте API и базу данных.</p>
      </section>
    );
  }

  return (
    <section className="soft-card admin-course-panel">
      <div className="admin-section-header">
        <div>
          <span className="admin-kicker">Работа с курсом</span>
          <h2>{courseMap.course.title}</h2>
          <p>{courseMap.course.description}</p>
        </div>
        <div className="admin-total-strip" aria-label="Итоги курса">
          <span>
            <strong>{courseMap.totals.levels}</strong>
            уровней
          </span>
          <span>
            <strong>{courseMap.totals.modules}</strong>
            модулей
          </span>
          <span>
            <strong>{courseMap.totals.lessons}</strong>
            уроков
          </span>
        </div>
      </div>

      <div className="course-map-list">
        {courseMap.course.levels.map((level) => (
          <article className="admin-level-row" key={level.code}>
            <div className="admin-level-main">
              <span className="status-pill">{level.code}</span>
              <div>
                <h3>{level.title}</h3>
                <p>
                  {level.modules.length} модуль, {level.lessonCount} уроков в базе.
                </p>
              </div>
            </div>

            <div className="admin-module-list">
              {level.modules.map((module) => (
                <div className="admin-module-row" key={module.title}>
                  <div className="admin-module-title">
                    <strong>{module.title}</strong>
                    <span>{module.lessonCount} уроков</span>
                  </div>
                  <ol className="admin-lesson-preview">
                    {module.previewLessons.map((lesson) => (
                      <li key={lesson.slug}>
                        <span>{String(lesson.orderIndex).padStart(2, "0")}</span>
                        {lesson.title}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
