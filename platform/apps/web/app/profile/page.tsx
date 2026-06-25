import { AppShell } from "../../components/AppShell";
import { AuthGate } from "../../components/AuthGate";
import { ProfilePanel } from "../../components/ProfilePanel";

export default function ProfilePage() {
  return (
    <AppShell showBanner={false}>
      <main className="page-main">
        <div className="container">
          <section className="section-copy">
            <h1>ПРОФИЛЬ</h1>
            <p>Данные аккаунта, прогресс курса, баллы и достижения.</p>
          </section>
          <AuthGate>
            <ProfilePanel />
          </AuthGate>
        </div>
      </main>
    </AppShell>
  );
}
