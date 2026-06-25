"use client";

import { Activity, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

type ActivityResponse = {
  events: Array<{
    id: string;
    type: string;
    createdAt: string;
    metadata: unknown;
    user: {
      displayName: string;
      email: string;
    } | null;
  }>;
  signals: Array<{
    id: string;
    type: string;
    severity: string;
    status: string;
    createdAt: string;
    user: {
      displayName: string;
    } | null;
  }>;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const signalLabels: Record<string, string> = {
  ACCOUNT_SHARING_SUSPECTED: "Возможная передача аккаунта",
  TOXIC_ASSISTANT_INPUT: "Недопустимый запрос к ассистенту"
};
const eventLabels: Record<string, string> = {
  ACCOUNT_REGISTERED: "Регистрация аккаунта",
  LOGIN_SUCCESS: "Успешный вход",
  TASK_ANSWERED: "Ответ на задание",
  HOMEWORK_SUBMITTED: "Отправка домашней работы",
  HOMEWORK_REVIEWED: "Домашняя работа проверена",
  HOMEWORK_REVIEW_CREATED: "Создана проверка домашней работы",
  ASSISTANT_ACTION_USED: "Использован ИИ-ассистент",
  DEMO_STUDY_DAY: "Учебная активность",
  DICTIONARY_TERM_SAVED: "Слово добавлено в словарь"
};
const severityLabels: Record<string, string> = {
  low: "низкий риск",
  medium: "средний риск",
  high: "высокий риск",
  critical: "критический риск"
};

export function AdminSecurityPanel() {
  const [data, setData] = useState<ActivityResponse>({ events: [], signals: [] });

  useEffect(() => {
    fetch(`${apiBaseUrl}/admin/activity`, { credentials: "include" })
      .then((response) => (response.ok ? response.json() : { events: [], signals: [] }))
      .then((value) => setData(value as ActivityResponse))
      .catch(() => undefined);
  }, []);

  return (
    <div className="security-layout">
      <section className="workspace-panel">
        <div className="panel-heading">
          <div>
            <span>Автоматическая проверка</span>
            <h2>Сигналы риска</h2>
          </div>
          <ShieldCheck size={22} />
        </div>
        {data.signals.length === 0 ? (
          <div className="workspace-empty compact">
            <ShieldCheck size={28} />
            <h3>Открытых сигналов нет</h3>
            <p>Здесь появятся предупреждения о передаче аккаунтов и нарушениях в запросах к ассистенту.</p>
          </div>
        ) : (
          <div className="signal-list">
            {data.signals.map((signal) => (
              <article key={signal.id}>
                <TriangleAlert size={18} />
                <div>
                  <strong>{signalLabels[signal.type] ?? signal.type}</strong>
                  <span>
                    {signal.user?.displayName ?? "Анонимный пользователь"} ·{" "}
                    {severityLabels[signal.severity] ?? signal.severity}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="workspace-panel">
        <div className="panel-heading">
          <div>
            <span>Последние 150 событий</span>
            <h2>История активности</h2>
          </div>
          <Activity size={22} />
        </div>
        <div className="activity-list">
          {data.events.map((event) => (
            <article key={event.id}>
              <span className="activity-dot" />
              <div>
                <strong>{eventLabels[event.type] ?? event.type}</strong>
                <span>
                  {event.user?.displayName ?? "Система"} ·{" "}
                  {new Date(event.createdAt).toLocaleString("ru-RU")}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
