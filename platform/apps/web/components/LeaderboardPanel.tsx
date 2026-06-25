"use client";

import { Medal, Target, Trophy, Zap } from "lucide-react";
import { useEffect, useState } from "react";

type Entry = {
  userId: string;
  rank: number;
  displayName: string;
  avatarUrl: string | null;
  points: number;
  taskPoints: number;
  homeworkPoints: number;
  accuracy: number;
  activeDays: number;
  isCurrentUser: boolean;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const periodLabels = { day: "День", week: "Неделя", month: "Месяц" } as const;

export function LeaderboardPanel() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    fetch(`${apiBaseUrl}/gamification/leaderboard?period=${period}`, {
      credentials: "include",
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) throw new Error("Leaderboard unavailable");
        return response.json() as Promise<{ entries: Entry[] }>;
      })
      .then((data) => {
        setEntries(data.entries);
        setLoading(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [period]);

  return (
    <section className="workspace-panel">
      <div className="panel-heading">
        <div>
          <span>Баллы и точность</span>
          <h2>Рейтинг учеников</h2>
        </div>
        <div className="segmented-control">
          {(["day", "week", "month"] as const).map((value) => (
            <button
              className={period === value ? "active" : ""}
              key={value}
              onClick={() => setPeriod(value)}
              type="button"
            >
              {periodLabels[value]}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="workspace-state">Составляем рейтинг...</div> : null}
      {!loading ? (
        <div className="leaderboard-table">
          <div className="leaderboard-row header">
            <span>Место</span>
            <span>Ученик</span>
            <span>Баллы</span>
            <span>Точность</span>
            <span>Активные дни</span>
          </div>
          {entries.map((entry) => (
            <article
              className={`leaderboard-row ${entry.isCurrentUser ? "current" : ""}`}
              key={entry.userId}
            >
              <span className="leaderboard-rank">
                {entry.rank <= 3 ? <Medal size={20} /> : null}
                {entry.rank}
              </span>
              <span className="leaderboard-user">
                <span className="profile-avatar">
                  {entry.avatarUrl ? (
                    <img src={entry.avatarUrl} alt="" />
                  ) : (
                    entry.displayName.slice(0, 1).toUpperCase()
                  )}
                </span>
                <strong>{entry.displayName}</strong>
              </span>
              <span>
                <Trophy size={16} />
                {entry.points}
              </span>
              <span>
                <Target size={16} />
                {entry.accuracy}%
              </span>
              <span>
                <Zap size={16} />
                {entry.activeDays}
              </span>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
