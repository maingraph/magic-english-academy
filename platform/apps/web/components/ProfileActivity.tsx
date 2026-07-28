"use client";

import { Flame } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const dayMs = 86_400_000;

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function ProfileActivity() {
  const [activeDays, setActiveDays] = useState<string[]>([]);
  const [todayKey, setTodayKey] = useState(() => isoDay(startOfUtcDay()));
  const [serverStats, setServerStats] = useState({ weeklyDays: 0, streakWeeks: 0 });

  useEffect(() => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
    fetch(`${apiBaseUrl}/profile/activity/visit`, {
      method: "POST",
      credentials: "include"
    })
      .then(() =>
        fetch(`${apiBaseUrl}/profile/activity?months=6`, { credentials: "include" })
      )
      .then(async (response) => {
        if (!response.ok) throw new Error("activity unavailable");
        return response.json() as Promise<{
          activeDays: string[];
          today: string;
          weeklyDays: number;
          streakWeeks: number;
        }>;
      })
      .then((data) => {
        setActiveDays(data.activeDays);
        setTodayKey(data.today);
        setServerStats({
          weeklyDays: data.weeklyDays,
          streakWeeks: data.streakWeeks
        });
      })
      .catch(() => {
        setActiveDays([]);
      });
  }, []);

  const activity = useMemo(() => {
    const active = new Set(activeDays);
    const today = new Date(`${todayKey}T00:00:00.000Z`);
    const currentMonday = new Date(today);
    const weekday = (currentMonday.getUTCDay() + 6) % 7;
    currentMonday.setUTCDate(currentMonday.getUTCDate() - weekday);
    const firstMonday = new Date(currentMonday.getTime() - 25 * 7 * dayMs);
    const weeks = Array.from({ length: 26 }, (_, weekIndex) =>
      Array.from({ length: 7 }, (_, dayIndex) => {
        const date = new Date(firstMonday.getTime() + (weekIndex * 7 + dayIndex) * dayMs);
        const key = isoDay(date);
        return { key, active: active.has(key), future: date > today };
      })
    );

    return { weeks };
  }, [activeDays, todayKey]);

  return (
    <section className="profile-activity workspace-panel">
      <div className="activity-heading">
        <div>
          <span>Последние 6 месяцев</span>
          <h2>Активность</h2>
          <p>Клетка загорается только в день входа на платформу.</p>
        </div>
        <div className="weekly-streak">
          <span><Flame size={21} fill="currentColor" /></span>
          <div>
            <strong>{serverStats.weeklyDays} из 7 дней</strong>
            <small>
              {serverStats.streakWeeks > 0
                ? `${serverStats.streakWeeks} нед. в ритме`
                : "Начало новой серии"}
            </small>
          </div>
        </div>
      </div>

      <div className="activity-scroll">
        <div className="activity-grid" aria-label="Календарь активности">
          {activity.weeks.map((week, weekIndex) => (
            <div className="activity-week" key={week[0]?.key ?? weekIndex}>
              {week.map((day) => (
                <span
                  className={`${day.active ? "active" : ""} ${day.future ? "future" : ""}`}
                  key={day.key}
                  title={`${day.key}: ${day.active ? "был вход" : "нет активности"}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="week-streak-row">
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((label, index) => {
          const active = activity.weeks.at(-1)?.[index]?.active;
          return (
            <span className={active ? "active" : ""} key={label}>
              <i>{active ? "✓" : ""}</i>
              {label}
            </span>
          );
        })}
      </div>
    </section>
  );
}
