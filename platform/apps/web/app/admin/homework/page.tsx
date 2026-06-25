import { AppShell } from "../../../components/AppShell";
import { AdminHomeworkPanel } from "../../../components/AdminHomeworkPanel";
import { AuthGate } from "../../../components/AuthGate";

export default function AdminHomeworkPage() {
  return (
    <AppShell showBanner={false}>
      <main className="page-main">
        <div className="container">
          <section className="section-copy">
            <h1>ПРОВЕРКА ДОМАШНИХ РАБОТ</h1>
            <p>Проверка ответов, выставление баллов и полезная обратная связь ученику.</p>
          </section>
          <AuthGate role="admin">
            <AdminHomeworkPanel />
          </AuthGate>
        </div>
      </main>
    </AppShell>
  );
}
