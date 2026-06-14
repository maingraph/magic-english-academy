import { AppShell } from "../../components/AppShell";
import { AdminArticlePanel } from "../../components/AdminArticlePanel";
import { AdminCourseWorkspace } from "../../components/AdminCourseWorkspace";
import { AdminDictionaryPanel } from "../../components/AdminDictionaryPanel";
import { AdminOverviewPanel } from "../../components/AdminOverviewPanel";
import { AuthGate } from "../../components/AuthGate";

const adminAreas = [
  {
    title: "Работа с курсом",
    text: "Уровни, уроки, блоки, задания, домашка и публикация материалов."
  },
  {
    title: "Работа со статьями",
    text: "Методики, подарки, дополнительные материалы и SEO-страницы."
  },
  {
    title: "Пользователи",
    text: "Доступы, прогресс, домашка, роли, заметки и подозрительная активность."
  },
  {
    title: "Метрики",
    text: "Продажи, активность, точность заданий, удержание и недельные лидеры."
  }
];

export default function AdminPage() {
  return (
    <AppShell>
      <main className="page-main">
        <div className="container">
          <section className="section-copy">
            <h1>АДМИНКА MAGIC ENGLISH</h1>
            <p>
              Админские экраны будут плотнее и рабочее, но визуально останутся в
              бренде курса: белые поверхности, оранжевый акцент, спокойная
              типографика и понятные блоки.
            </p>
          </section>

          <section className="admin-grid">
            {adminAreas.map((area) => (
              <article className="soft-card" key={area.title}>
                <h2>{area.title}</h2>
                <p>{area.text}</p>
              </article>
            ))}
          </section>

          <AuthGate role="admin">
            <AdminOverviewPanel />
            <AdminCourseWorkspace />
            <AdminDictionaryPanel />
            <AdminArticlePanel />
          </AuthGate>
        </div>
      </main>
    </AppShell>
  );
}
