import { AppShell } from "../../../components/AppShell";
import { AdminArticlePanel } from "../../../components/AdminArticlePanel";
import { AuthGate } from "../../../components/AuthGate";

export default function AdminArticlesPage() {
  return (
    <AppShell showBanner={false}>
      <main className="page-main">
        <div className="container">
          <section className="section-copy">
            <h1>СТАТЬИ</h1>
            <p>Создание, редактирование и публикация дополнительных материалов курса.</p>
          </section>
          <AuthGate role="admin">
            <AdminArticlePanel />
          </AuthGate>
        </div>
      </main>
    </AppShell>
  );
}
