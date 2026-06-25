import { AppShell } from "../../components/AppShell";
import { AuthGate } from "../../components/AuthGate";
import { LeaderboardPanel } from "../../components/LeaderboardPanel";

export default function LeaderboardPage() {
  return (
    <AppShell showBanner={false}>
      <main className="page-main">
        <div className="container">
          <section className="section-copy">
            <h1>ТАБЛИЦА ЛИДЕРОВ</h1>
            <p>Рейтинг учитывает задания, проверенные домашние работы, точность и активность.</p>
          </section>
          <AuthGate>
            <LeaderboardPanel />
          </AuthGate>
        </div>
      </main>
    </AppShell>
  );
}
