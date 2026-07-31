"use client";

import { BookOpen, CalendarDays, Flame, MessageCircle, Play, RotateCcw, StickyNote, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

type Dashboard = {
  user: { displayName: string };
  nextLesson: null | { slug: string; title: string; summary?: string; estimatedMinutes: number; skill?: string; levelCode: string; moduleTitle: string; status: string };
  weeklyGoal: { target: number; completed: number };
  levels: Array<{ code: string; title: string; total: number; completed: number; percent: number }>;
  schedule: Array<{ id: string; title: string; startsAt: string; type: string }>;
  recommendations: { dueReviews: number; newFeedPosts: number };
  streak: { days: number; weeks: number; petStage: number };
  unreadNotifications: number;
  achievements: Array<{ id: string; achievement: { title: string } }>;
  activity: string[];
};

export function DashboardProgressPanel() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${apiBaseUrl}/dashboard`, { credentials: "include" })
      .then((response) => {
        if (!response.ok) throw new Error("dashboard");
        return response.json();
      })
      .then((value) => setData(value as Dashboard))
      .catch(() => setError(true));
  }, []);

  if (error) return <section className="soft-card api-status warning"><h2>Обзор недоступен</h2><p>Проверьте соединение с API.</p></section>;
  if (!data) return <section className="dashboard-loading"><span /><span /><span /><p>Собираем твой маршрут…</p></section>;

  const goalPercent = Math.min(100, Math.round((data.weeklyGoal.completed / Math.max(data.weeklyGoal.target, 1)) * 100));
  const active = new Set(data.activity);
  const heatmap = Array.from({ length: 112 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (111 - index));
    const key = date.toISOString().slice(0, 10);
    return { key, active: active.has(key) };
  });

  return (
    <div className="experience-dashboard">
      <section className="dashboard-welcome">
        <div><span>Обзор обучения</span><h1>Добрый день, {data.user.displayName.split(" ")[0]}</h1><p>Открой урок. Сделай шаг. Увидь прогресс.</p></div>
        <time>{new Intl.DateTimeFormat("ru", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</time>
      </section>

      <section className="dashboard-hero-grid">
        <article className="next-lesson-hero">
          <div className="lesson-hero-glow" />
          <header><span>Следующий шаг · {data.nextLesson?.levelCode ?? "маршрут завершён"}</span><strong><Flame size={16} /> серия {data.streak.days} дней</strong></header>
          <h2>{data.nextLesson?.title ?? "Все доступные уроки пройдены"}</h2>
          <p>{data.nextLesson?.summary ?? "Закрепи материал тренировкой или открой следующий уровень."}</p>
          {data.nextLesson ? <div className="lesson-hero-meta"><span>{data.nextLesson.estimatedMinutes} минут</span><span>{data.nextLesson.moduleTitle}</span><span>{data.nextLesson.skill ?? "комплексный"}</span></div> : null}
          <footer>
            {data.nextLesson ? <Link className="hero-primary" href={`/courses/${data.nextLesson.levelCode.toLowerCase()}/lessons/${data.nextLesson.slug}`}><Play size={17} />Продолжить урок</Link> : <Link className="hero-primary" href="/training"><RotateCcw size={17} />Повторить слова</Link>}
            <Link className="hero-secondary" href="/notes"><StickyNote size={17} />Открыть заметки</Link>
          </footer>
        </article>
        <article className="weekly-goal-card">
          <header><span>Цель недели</span><Link href="/calendar">Изменить</Link></header>
          <div className="goal-ring" style={{ "--progress": `${goalPercent * 3.6}deg` } as React.CSSProperties}><strong>{data.weeklyGoal.completed}/{data.weeklyGoal.target}</strong></div>
          <h3>{goalPercent >= 100 ? "Цель закрыта" : "Почти готово"}</h3>
          <p>{goalPercent >= 100 ? "Отличная неделя!" : `Осталось занятий: ${Math.max(data.weeklyGoal.target - data.weeklyGoal.completed, 0)}`}</p>
          <div className="week-markers">{["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map((day, index) => <span className={index < data.weeklyGoal.completed ? "done" : ""} key={day}>{index < data.weeklyGoal.completed ? "✓" : day}</span>)}</div>
        </article>
      </section>

      <section className="dashboard-cards-grid">
        <article className="dashboard-feature-card level-card"><header><div><span>Твой маршрут</span><h2>Прогресс по уровням</h2></div><Link href="/courses">Открыть</Link></header>{data.levels.map((level) => <div className="level-progress-row" key={level.code}><strong>{level.code}</strong><div><span style={{ width: `${level.percent}%` }} /></div><small>{level.completed}/{level.total}</small></div>)}</article>
        <article className="dashboard-feature-card schedule-card"><header><div><span>Ближайшее</span><h2>Расписание</h2></div><Link href="/calendar"><CalendarDays size={18} /></Link></header>{data.schedule.length ? data.schedule.slice(0, 4).map((event) => <div className="schedule-row" key={event.id}><time>{new Intl.DateTimeFormat("ru", { weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(event.startsAt))}</time><strong>{event.title}</strong></div>) : <p>Добавь удобные дни занятий в календаре.</p>}</article>
        <article className="dashboard-feature-card recommendation-card"><header><div><span>Для тебя</span><h2>Следующие действия</h2></div><Trophy size={20} /></header><Link href="/training"><RotateCcw size={18} /><span><strong>{data.recommendations.dueReviews} слов ждут повторения</strong><small>Умный интервал уже рассчитан</small></span></Link><Link href="/feed"><MessageCircle size={18} /><span><strong>{data.recommendations.newFeedPosts} новых публикаций</strong><small>Материалы и speaking clubs</small></span></Link><Link href="/courses"><BookOpen size={18} /><span><strong>Продолжить маршрут</strong><small>Все уровни от A0 до C1</small></span></Link></article>
      </section>

      <section className="dashboard-bottom-grid">
        <article className="activity-card"><header><div><span>Последние 16 недель</span><h2>Активность</h2></div><strong><Flame size={17} /> {data.streak.weeks} нед. стрика</strong></header><div className="activity-heatmap">{heatmap.map((day) => <span className={day.active ? "active" : ""} title={day.key} key={day.key} />)}</div><p>Клетка закрашивается только в день входа на платформу.</p></article>
        <article className="fire-pet-card"><span>Твой огонёк · стадия {data.streak.petStage + 1}</span><div className={`fire-pet stage-${data.streak.petStage}`}>🔥</div><h2>{data.streak.days ? `${data.streak.days} дней вместе` : "Зажги серию"}</h2><p>Заходи и занимайся каждую неделю.</p></article>
      </section>
    </div>
  );
}
