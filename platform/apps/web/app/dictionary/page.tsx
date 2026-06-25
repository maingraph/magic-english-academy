import { AppShell } from "../../components/AppShell";
import { AuthGate } from "../../components/AuthGate";
import { DictionaryWorkspace } from "../../components/DictionaryWorkspace";

export default function DictionaryPage() {
  return (
    <AppShell showBanner={false}>
      <main className="page-main">
        <div className="container">
          <section className="section-copy">
            <h1>СЛОВАРЬ</h1>
            <p>Сохраняйте слова из уроков, изучайте примеры и тренируйте произношение.</p>
          </section>
          <AuthGate>
            <DictionaryWorkspace />
          </AuthGate>
        </div>
      </main>
    </AppShell>
  );
}
