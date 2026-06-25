import { AppShell } from "../../../components/AppShell";
import { AdminCourseWorkspace } from "../../../components/AdminCourseWorkspace";
import { AdminDictionaryPanel } from "../../../components/AdminDictionaryPanel";
import { AuthGate } from "../../../components/AuthGate";

export default function AdminCoursePage() {
  return (
    <AppShell showBanner={false}>
      <main className="page-main">
        <div className="container">
          <section className="section-copy">
            <h1>КОНСТРУКТОР КУРСА</h1>
            <p>Импорт материалов Notion, блоки уроков, задания, медиа и термины курса.</p>
          </section>
          <AuthGate role="admin">
            <AdminCourseWorkspace />
            <AdminDictionaryPanel />
          </AuthGate>
        </div>
      </main>
    </AppShell>
  );
}
