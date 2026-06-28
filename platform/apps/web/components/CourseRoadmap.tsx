"use client";

import Link from "next/link";
import { Lock, Route, Sparkles, Unlock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CourseLevel } from "../lib/courses";

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
    isUnlocked?: boolean;
  }>;
  nextLessons: Array<{
    slug: string;
    title: string;
    levelCode: string;
    moduleTitle: string;
    status: LessonStatus;
  }>;
};

type PlacementQuestion = {
  id: string;
  prompt: string;
  options: string[];
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export function CourseRoadmap({ levels }: { levels: CourseLevel[] }) {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [questions, setQuestions] = useState<PlacementQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [testOpen, setTestOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetch(`${apiBaseUrl}/progress/summary`, {
        credentials: "include",
        signal: controller.signal
      }),
      fetch(`${apiBaseUrl}/progress/placement-test`, {
        credentials: "include",
        signal: controller.signal
      })
    ])
      .then(async ([summaryResponse, testResponse]) => {
        if (summaryResponse.ok) {
          setSummary((await summaryResponse.json()) as ProgressSummary);
        }
        if (testResponse.ok) {
          const data = (await testResponse.json()) as { questions: PlacementQuestion[] };
          setQuestions(data.questions);
        }
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  const progressByCode = useMemo(
    () => new Map(summary?.levelProgress.map((level) => [level.code, level]) ?? []),
    [summary]
  );

  async function submitPlacement() {
    const orderedAnswers = questions.map((question) => answers[question.id] ?? "");

    const response = await fetch(`${apiBaseUrl}/progress/placement-test`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers: orderedAnswers })
    });

    if (!response.ok) {
      setMessage("Ответьте на все вопросы входного теста.");
      return;
    }

    const result = (await response.json()) as { levelCode: string; score: number; total: number };
    setMessage(`Открыт уровень ${result.levelCode}. Результат: ${result.score}/${result.total}.`);
    setTestOpen(false);
    const summaryResponse = await fetch(`${apiBaseUrl}/progress/summary`, {
      credentials: "include"
    });
    if (summaryResponse.ok) {
      setSummary((await summaryResponse.json()) as ProgressSummary);
    }
  }

  return (
    <>
      <section className="course-roadmap-hero">
        <div>
          <span className="admin-kicker">Карта курса</span>
          <h1>Путь от A1 до C1</h1>
          <p>
            Уровни открываются по прогрессу. Если английский уже есть, входной тест
            сразу перенесёт вас на подходящий уровень.
          </p>
        </div>
        <button className="placement-button" onClick={() => setTestOpen(true)} type="button">
          <Sparkles size={18} />
          Пройти входной тест
        </button>
      </section>

      <section className="course-overall-panel">
        <div className="progress-label">
          <span>
            Общий прогресс: {summary?.totals.completedLessons ?? 0}/
            {summary?.totals.lessons ?? levels.reduce((sum, level) => sum + level.lessonCount, 0)}
          </span>
          <strong>{summary?.totals.percent ?? 0}%</strong>
        </div>
        <div className="progress-track">
          <span style={{ width: `${summary?.totals.percent ?? 0}%` }} />
        </div>
        {message ? <p className="form-message">{message}</p> : null}
      </section>

      <section className="course-roadmap" aria-label="Уровни курса">
        {levels.map((level) => {
          const progress = progressByCode.get(level.code);
          const isUnlocked = progress?.isUnlocked ?? level.code === "A1";
          const percent = progress?.percent ?? 0;

          return (
            <article
              className={`roadmap-level ${isUnlocked ? "unlocked" : "locked"}`}
              key={level.code}
            >
              <div className="roadmap-marker">
                {isUnlocked ? <Unlock size={18} /> : <Lock size={18} />}
              </div>
              <div className="roadmap-card">
                <div className="roadmap-card-head">
                  <span>{level.code}</span>
                  <strong>{level.title}</strong>
                </div>
                <p>
                  {progress?.completedLessons ?? 0}/{progress?.totalLessons ?? level.lessonCount}
                  {" "}уроков завершено
                </p>
                <div className="progress-track">
                  <span style={{ width: `${percent}%` }} />
                </div>
                <ul>
                  {level.sampleTopics.slice(0, 3).map((topic) => (
                    <li key={topic}>{topic}</li>
                  ))}
                </ul>
                {isUnlocked ? (
                  <Link href={`/courses/${level.code.toLowerCase()}`}>
                    <Route size={16} />
                    Открыть уровень
                  </Link>
                ) : (
                  <small>Откроется после 80% предыдущего уровня или входного теста.</small>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {testOpen ? (
        <section className="placement-modal" role="dialog" aria-modal="true">
          <div className="placement-card">
            <div className="panel-heading">
              <div>
                <span>Входной тест</span>
                <h2>Проверка уровня</h2>
              </div>
              <button onClick={() => setTestOpen(false)} type="button">
                Закрыть
              </button>
            </div>
            {questions.map((question) => (
              <fieldset key={question.id}>
                <legend>{question.prompt}</legend>
                {question.options.map((option) => (
                  <label key={option}>
                    <input
                      checked={answers[question.id] === option}
                      name={question.id}
                      onChange={() =>
                        setAnswers((current) => ({ ...current, [question.id]: option }))
                      }
                      type="radio"
                    />
                    {option}
                  </label>
                ))}
              </fieldset>
            ))}
            <button className="placement-submit" onClick={submitPlacement} type="button">
              Завершить тест
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}
