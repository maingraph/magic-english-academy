import { AchievementsPanel } from "../../components/AchievementsPanel";
import { AppShell } from "../../components/AppShell";
import { AuthGate } from "../../components/AuthGate";

export default function AchievementsPage() {
  return (
    <AppShell showBanner={false}>
      <main className="page-main">
        <div className="container">
          <section className="section-copy">
            <h1>ДОСТИЖЕНИЯ</h1>
            <p>Награды за уроки, домашние работы, учебный стрик и завершение курса.</p>
          </section>
          <AuthGate>
            <AchievementsPanel />
          </AuthGate>
        </div>
      </main>
    </AppShell>
  );
}
