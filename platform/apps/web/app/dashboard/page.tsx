import { AppShell } from "../../components/AppShell";
import { AuthGate } from "../../components/AuthGate";
import { DashboardProgressPanel } from "../../components/DashboardProgressPanel";
import { HomeworkPanel } from "../../components/HomeworkPanel";

export default function DashboardPage() {
  return (
    <AppShell>
      <main className="page-main">
        <div className="container">
          <section className="section-copy">
            <h1>МОЙ ПРОГРЕСС</h1>
            <p>
              Кабинет показывает реальный прогресс из базы: начатые и
              завершённые уроки, процент курса и ближайшие занятия.
            </p>
          </section>

          <AuthGate>
            <DashboardProgressPanel />
            <HomeworkPanel />
          </AuthGate>
        </div>
      </main>
    </AppShell>
  );
}
