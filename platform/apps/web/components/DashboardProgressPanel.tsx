"use client";

import { Award, BookOpenCheck, Flame, Trophy } from "lucide-react";
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
    isUnlocked?: boolean;
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

type AchievementSummary = {
  earnedCount: number;
  totalCount: number;
  achievements: Array<{
    code: string;
    title: string;
    description: string;
    earned: boolean;
    progress: number;
    target: number;
  }>;
};

type LeaderboardEntry = {
  userId: string;
  rank: number;
  displayName: string;
  points: number;
  accuracy: number;
  activeDays: number;
  isCurrentUser: boolean;
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
  const [achievements, setAchievements] = useState<AchievementSummary | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();

    async function loadSummary() {
      try {
        const [progressResponse, achievementsResponse, leaderboardResponse] =
          await Promise.all([
            fetch(`${apiBaseUrl}/progress/summary`, {
              credentials: "include",
              signal: controller.signal
            }),
            fetch(`${apiBaseUrl}/gamification/achievements`, {
              credentials: "include",
              signal: controller.signal
            }),
            fetch(`${apiBaseUrl}/gamification/leaderboard?period=week`, {
              credentials: "include",
              signal: controller.signal
            })
          ]);

        if (!progressResponse.ok) {
          throw new Error(`Progress summary failed: ${progressResponse.status}`);
        }

        setSummary((await progressResponse.json()) as ProgressSummary);
        if (achievementsResponse.ok) {
          setAchievements((await achievementsResponse.json()) as AchievementSummary);
        }
        if (leaderboardResponse.ok) {
          const data = (await leaderboardResponse.json()) as { entries: LeaderboardEntry[] };
          setLeaderboard(data.entries);
        }
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

  const nextLesson = summary.nextLessons[0];
  const currentRank = leaderboard.find((entry) => entry.isCurrentUser);
  const earnedPreview = achievements?.achievements.filter((achievement) => achievement.earned).slice(0, 3) ?? [];

  return (
    <>
      <section className="daily-overview">
        <article className="overview-main-card">
          <span className="admin-kicker">Сегодня</span>
          <h2>Продолжить обучение</h2>
          {nextLesson ? (
            <>
              <p>
                Следующий шаг: {nextLesson.levelCode} · {nextLesson.moduleTitle}
              </p>
              <Link
                href={`/courses/${nextLesson.levelCode.toLowerCase()}/lessons/${nextLesson.slug}`}
              >
                <BookOpenCheck size={18} />
                {nextLesson.title}
              </Link>
            </>
          ) : (
            <p>Все доступные уроки завершены. Можно пройти входной тест или открыть следующий уровень.</p>
          )}
        </article>
        <article className="overview-rank-card">
          <Trophy size={22} />
          <strong>{currentRank ? `#${currentRank.rank}` : "—"}</strong>
          <span>Место за неделю</span>
        </article>
      </section>

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
        <article className="soft-card metric-card">
          <strong>{achievements?.earnedCount ?? 0}</strong>
          <span>Достижения</span>
        </article>
      </section>

      <section className="soft-card">
        <h2>Прогресс по уровням</h2>
        {summary.levelProgress.map((level) => (
          <div className="progress-row" key={level.code}>
            <div className="progress-label">
              <span>
                {level.code} · {level.completedLessons}/{level.totalLessons}
                {level.isUnlocked === false ? " · закрыт" : ""}
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
        <h2>Ближайшие уроки</h2>
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

      <section className="dashboard-two-column">
        <article className="soft-card">
          <h2>Достижения</h2>
          <div className="achievement-mini-list">
            {earnedPreview.length > 0 ? (
              earnedPreview.map((achievement) => (
                <span key={achievement.code}>
                  <Award size={16} />
                  {achievement.title}
                </span>
              ))
            ) : (
              <p>Первое достижение появится после завершения урока.</p>
            )}
          </div>
        </article>
        <article className="soft-card">
          <h2>Кто впереди</h2>
          <div className="leaderboard-mini-list">
            {leaderboard.slice(0, 3).map((entry) => (
              <span key={entry.userId} className={entry.isCurrentUser ? "current" : ""}>
                <Flame size={16} />
                #{entry.rank} {entry.displayName} · {entry.points} баллов
              </span>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
