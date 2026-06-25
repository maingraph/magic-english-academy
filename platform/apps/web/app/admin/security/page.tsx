import { AppShell } from "../../../components/AppShell";
import { AdminSecurityPanel } from "../../../components/AdminSecurityPanel";
import { AuthGate } from "../../../components/AuthGate";

export default function AdminSecurityPage() {
  return (
    <AppShell showBanner={false}>
      <main className="page-main">
        <div className="container">
          <section className="section-copy">
            <h1>БЕЗОПАСНОСТЬ И АКТИВНОСТЬ</h1>
            <p>Аудит событий, передача аккаунтов и сигналы злоупотребления ассистентом.</p>
          </section>
          <AuthGate role="admin">
            <AdminSecurityPanel />
          </AuthGate>
        </div>
      </main>
    </AppShell>
  );
}
