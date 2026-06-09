import { AppShell } from "../../components/AppShell";
import { ChecklistPreview } from "../../components/ChecklistPreview";
import { ProgressBar } from "../../components/ProgressBar";

const nextTopics = [
  { title: "Глагол to be (am/is/are)", completed: true },
  { title: "Личные местоимения", completed: true },
  { title: "Притяжательные местоимения" }
];

export default function DashboardPage() {
  return (
    <AppShell>
      <main className="page-main">
        <div className="container">
          <section className="section-copy">
            <h1>МОЙ ПРОГРЕСС</h1>
            <p>
              Будущий кабинет ученика: общий прогресс, ближайшие темы, баллы,
              домашка, словарик и достижения. Сейчас это дизайн-основа под
              реальные данные.
            </p>
          </section>

          <section className="dashboard-grid">
            <article className="soft-card metric-card">
              <strong>A1</strong>
              <span>Текущий уровень</span>
            </article>
            <article className="soft-card metric-card">
              <strong>2 / 164</strong>
              <span>Темы в прогрессе</span>
            </article>
            <article className="soft-card metric-card">
              <strong>120</strong>
              <span>Баллы за неделю</span>
            </article>
          </section>

          <section className="soft-card">
            <h2>Прогресс по уровням</h2>
            <ProgressBar label="A1" value={12} />
            <ProgressBar label="A2" value={0} />
            <ProgressBar label="B1" value={0} />
          </section>

          <section className="soft-card">
            <h2>Следующие темы</h2>
            <ChecklistPreview items={nextTopics} />
          </section>
        </div>
      </main>
    </AppShell>
  );
}
