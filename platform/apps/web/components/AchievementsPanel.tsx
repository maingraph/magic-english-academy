"use client";

import { Award, BookCheck, Flame, GraduationCap, Send } from "lucide-react";
import { useEffect, useState } from "react";

type Achievement = {
  code: string;
  title: string;
  description: string;
  earned: boolean;
  earnedAt: string | null;
  progress: number;
  target: number;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

const iconMap = {
  FIRST_LESSON: BookCheck,
  FIRST_HOMEWORK: Send,
  THREE_DAY_STREAK: Flame,
  COURSE_COMPLETE: GraduationCap
};

export function AchievementsPanel() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${apiBaseUrl}/gamification/achievements`, {
      credentials: "include"
    })
      .then((response) => {
        if (!response.ok) throw new Error("Achievements unavailable");
        return response.json() as Promise<{ achievements: Achievement[] }>;
      })
      .then((data) => {
        setAchievements(data.achievements);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="workspace-state">Загружаем достижения...</div>;
  }

  return (
    <div className="achievement-grid">
      {achievements.map((achievement) => {
        const Icon = iconMap[achievement.code as keyof typeof iconMap] ?? Award;
        const percent = Math.min(
          Math.round((achievement.progress / Math.max(achievement.target, 1)) * 100),
          100
        );

        return (
          <article
            className={`achievement-card ${achievement.earned ? "earned" : ""}`}
            key={achievement.code}
          >
            <div className="achievement-icon">
              <Icon size={28} />
            </div>
            <div>
              <span>{achievement.earned ? "Получено" : `Выполнено на ${percent}%`}</span>
              <h2>{achievement.title}</h2>
              <p>{achievement.description}</p>
            </div>
            <div className="achievement-progress">
              <span style={{ width: `${percent}%` }} />
            </div>
            <small>
              {achievement.earnedAt
                ? `Получено ${new Date(achievement.earnedAt).toLocaleDateString("ru-RU")}`
                : `${achievement.progress} / ${achievement.target}`}
            </small>
          </article>
        );
      })}
    </div>
  );
}
