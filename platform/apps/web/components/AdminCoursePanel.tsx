"use client";

import { useEffect, useState } from "react";

type AdminCourseMap = {
  source: string;
  course: {
    title: string;
    description: string | null;
    levels: Array<{
      id: string;
      code: string;
      title: string;
      lessonCount: number;
      modules: Array<{
        id: string;
        title: string;
        description: string | null;
        lessonCount: number;
        previewLessons: Array<{
          slug: string;
          title: string;
          summary: string | null;
          orderIndex: number;
        }>;
        lessons: Array<{
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
const adminHeaders = {
  "content-type": "application/json"
};

export function AdminCoursePanel({
  refreshToken,
  onChanged,
  onSelectLesson,
  selectedSlug
}: {
  refreshToken: number;
  onChanged: () => void;
  onSelectLesson: (slug: string) => void;
  selectedSlug: string | null;
}) {
  const [courseMap, setCourseMap] = useState<AdminCourseMap | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [moduleTitles, setModuleTitles] = useState<Record<string, string>>({});
  const [lessonTitles, setLessonTitles] = useState<Record<string, string>>({});
  const [moveTargets, setMoveTargets] = useState<Record<string, string>>({});

  useEffect(() => {
    const controller = new AbortController();

    async function loadCourseMap() {
      try {
        const response = await fetch(`${apiBaseUrl}/admin/course-map`, {
          credentials: "include",
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
  }, [refreshToken]);

  async function mutate(
    endpoint: string,
    options: RequestInit,
    selectSlug?: string | null
  ) {
    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      credentials: "include",
      headers: adminHeaders,
      ...options
    });

    if (!response.ok) {
      setStatus("error");
      return null;
    }

    const data = await response.json().catch(() => null);
    onChanged();
    if (selectSlug) {
      onSelectLesson(selectSlug);
    }
    return data;
  }

  async function createModule(levelId: string) {
    const title = moduleTitles[levelId]?.trim();
    if (!title) return;

    await mutate("/admin/modules", {
      method: "POST",
      body: JSON.stringify({ levelId, title })
    });
    setModuleTitles((current) => ({ ...current, [levelId]: "" }));
  }

  async function createLesson(moduleId: string) {
    const title = lessonTitles[moduleId]?.trim();
    if (!title) return;

    const lesson = await mutate("/admin/lessons", {
      method: "POST",
      body: JSON.stringify({ moduleId, title, summary: "Новый урок курса." })
    });
    if (lesson?.slug) {
      onSelectLesson(lesson.slug);
    }
    setLessonTitles((current) => ({ ...current, [moduleId]: "" }));
  }

  async function deleteLesson(slug: string) {
    if (!window.confirm("Удалить урок?")) return;
    await mutate(`/admin/lessons/${slug}`, { method: "DELETE" });
    if (selectedSlug === slug) onSelectLesson("");
  }

  async function moveLesson(slug: string, fallbackModuleId: string, orderIndex: number) {
    const moduleId = moveTargets[slug] ?? fallbackModuleId;
    await mutate(`/admin/lessons/${slug}/move`, {
      method: "PATCH",
      body: JSON.stringify({ moduleId, orderIndex })
    }, slug);
  }

  async function deleteModule(moduleId: string) {
    if (!window.confirm("Удалить пустую группу уроков?")) return;
    await mutate(`/admin/modules/${moduleId}`, { method: "DELETE" });
  }

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
              <div className="admin-inline-form">
                <input
                  value={moduleTitles[level.id] ?? ""}
                  onChange={(event) =>
                    setModuleTitles((current) => ({
                      ...current,
                      [level.id]: event.target.value
                    }))
                  }
                  placeholder="Новая группа уроков"
                />
                <button onClick={() => createModule(level.id)} type="button">
                  Добавить группу
                </button>
              </div>
              {level.modules.map((module) => (
                <div className="admin-module-row" key={module.id}>
                  <div className="admin-module-title">
                    <span>
                      <strong>{module.title}</strong>
                      <small>{module.description}</small>
                    </span>
                    <span>{module.lessonCount} уроков</span>
                  </div>
                  <div className="admin-inline-form">
                    <input
                      value={lessonTitles[module.id] ?? ""}
                      onChange={(event) =>
                        setLessonTitles((current) => ({
                          ...current,
                          [module.id]: event.target.value
                        }))
                      }
                      placeholder="Название нового урока"
                    />
                    <button onClick={() => createLesson(module.id)} type="button">
                      Добавить урок
                    </button>
                    {module.lessonCount === 0 ? (
                      <button onClick={() => deleteModule(module.id)} type="button">
                        Удалить группу
                      </button>
                    ) : null}
                  </div>
                  <ol className="admin-lesson-preview">
                    {module.lessons.map((lesson) => (
                      <li key={lesson.slug}>
                        <span>{String(lesson.orderIndex).padStart(2, "0")}</span>
                        <button
                          className={lesson.slug === selectedSlug ? "selected" : ""}
                          type="button"
                          onClick={() => onSelectLesson(lesson.slug)}
                        >
                          {lesson.title}
                        </button>
                        <select
                          aria-label="Перенести урок"
                          value={moveTargets[lesson.slug] ?? module.id}
                          onChange={(event) =>
                            setMoveTargets((current) => ({
                              ...current,
                              [lesson.slug]: event.target.value
                            }))
                          }
                        >
                          {level.modules.map((targetModule) => (
                            <option key={targetModule.id} value={targetModule.id}>
                              {targetModule.title}
                            </option>
                          ))}
                        </select>
                        <button
                          className="lesson-mini-action"
                          onClick={() => moveLesson(lesson.slug, module.id, lesson.orderIndex)}
                          type="button"
                        >
                          Перенести
                        </button>
                        <button
                          className="lesson-mini-action danger"
                          onClick={() => deleteLesson(lesson.slug)}
                          type="button"
                        >
                          Удалить
                        </button>
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
