"use client";

import { useEffect, useState } from "react";
import { ProgressBar } from "./ProgressBar";

type MetricTone = "neutral" | "good" | "warning";

type AdminOverview = {
  metrics: Array<{
    label: string;
    value: string;
    tone: MetricTone;
  }>;
  nativeMigrationPercent: number;
  riskSignals: Array<{
    label: string;
    count: number;
    tone: MetricTone;
  }>;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export function AdminOverviewPanel() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();

    async function loadOverview() {
      try {
        const response = await fetch(`${apiBaseUrl}/admin/overview`, {
          headers: {
            "x-user-role": "admin",
            "x-user-email": "admin@magic.local",
            "x-user-name": "Admin"
          },
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Admin overview failed: ${response.status}`);
        }

        setOverview((await response.json()) as AdminOverview);
        setStatus("ready");
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error);
          setStatus("error");
        }
      }
    }

    void loadOverview();

    return () => controller.abort();
  }, []);

  if (status === "loading") {
    return (
      <section className="soft-card api-status">
        <h2>Быстрый обзор платформы</h2>
        <p>Загружаем данные админки...</p>
      </section>
    );
  }

  if (status === "error" || !overview) {
    return (
      <section className="soft-card api-status warning">
        <h2>Быстрый обзор платформы</h2>
        <p>API сейчас недоступен. Проверьте `npm run dev` и порт 4000.</p>
      </section>
    );
  }

  return (
    <section className="soft-card">
      <h2>Быстрый обзор платформы</h2>
      <div className="dashboard-grid">
        {overview.metrics.map((metric) => (
          <article className={`metric-card compact-metric ${metric.tone}`} key={metric.label}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </article>
        ))}
      </div>
      <ProgressBar
        label="Нативная миграция курса"
        value={overview.nativeMigrationPercent}
      />
      <div className="risk-list">
        {overview.riskSignals.map((signal) => (
          <div className={`risk-item ${signal.tone}`} key={signal.label}>
            <span>{signal.label}</span>
            <strong>{signal.count}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
