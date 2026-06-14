import { AppShell } from "../../components/AppShell";
import { AuthGate } from "../../components/AuthGate";
import { DashboardProgressPanel } from "../../components/DashboardProgressPanel";

export default function DashboardPage() {
  return (
    <AppShell>
      <main className="page-main">
        <div className="container">
          <section className="section-copy">
            <h1>МОЙ ПРОГРЕСС</h1>
            <p>
              Кабинет уже читает реальный прогресс из базы. Следующие шаги:
              баллы, домашка, словарик и достижения.
            </p>
          </section>

          <AuthGate>
            <DashboardProgressPanel />
          </AuthGate>
        </div>
      </main>
    </AppShell>
  );
}
