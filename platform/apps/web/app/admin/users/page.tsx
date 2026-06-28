import { AppShell } from "../../../components/AppShell";
import { AdminUsersPanel } from "../../../components/AdminUsersPanel";
import { AuthGate } from "../../../components/AuthGate";

export default function AdminUsersPage() {
  return (
    <AppShell showBanner={false}>
      <main className="page-main">
        <div className="container">
          <section className="section-copy">
            <h1>ПОЛЬЗОВАТЕЛИ</h1>
            <p>Статус аккаунта, прогресс, баллы, проверочные задания и сигналы риска.</p>
          </section>
          <AuthGate role="admin">
            <AdminUsersPanel />
          </AuthGate>
        </div>
      </main>
    </AppShell>
  );
}
