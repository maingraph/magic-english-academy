import { AppShell } from "../../../components/AppShell";
import { AdminSettingsPanel } from "../../../components/AdminSettingsPanel";
import { AuthGate } from "../../../components/AuthGate";

export default function AdminSettingsPage() {
  return (
    <AppShell showBanner={false}>
      <main className="page-main">
        <div className="container">
          <section className="section-copy">
            <h1>НАСТРОЙКИ ПЛАТФОРМЫ</h1>
            <p>ИИ-провайдер, зашифрованный API-ключ, лимиты и отправка писем.</p>
          </section>
          <AuthGate role="admin">
            <AdminSettingsPanel />
          </AuthGate>
        </div>
      </main>
    </AppShell>
  );
}
