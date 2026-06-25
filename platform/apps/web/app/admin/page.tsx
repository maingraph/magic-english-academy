import { AppShell } from "../../components/AppShell";
import { AdminOverviewPanel } from "../../components/AdminOverviewPanel";
import { AuthGate } from "../../components/AuthGate";

export default function AdminPage() {
  return (
    <AppShell showBanner={false}>
      <main className="page-main">
        <div className="container">
          <section className="section-copy">
            <h1>ОБЗОР ПЛАТФОРМЫ</h1>
            <p>Миграция курса, активность, качество обучения, продажи и сигналы риска.</p>
          </section>
          <AuthGate role="admin">
            <AdminOverviewPanel />
          </AuthGate>
        </div>
      </main>
    </AppShell>
  );
}
