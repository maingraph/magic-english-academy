import { AppShell } from "../../components/AppShell";
import { AuthGate } from "../../components/AuthGate";
import { DashboardProgressPanel } from "../../components/DashboardProgressPanel";

export default function DashboardPage() {
  return (
    <AppShell>
      <main className="page-main">
        <div className="container">
          <section className="section-copy">
            <h1>ОБЗОР ОБУЧЕНИЯ</h1>
            <p>
              Здесь видно, где вы остановились, какие уровни открыты, кто впереди
              в рейтинге и какие достижения уже получены.
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
