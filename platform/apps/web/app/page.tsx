import { AppShell } from "../components/AppShell";
import { ChecklistPreview } from "../components/ChecklistPreview";
import { MagicButton } from "../components/MagicButton";

const previewTopics = [
  { title: "Глагол to be (am/is/are)", completed: true },
  { title: "Настоящее простое время (Present Simple)" },
  { title: "Способы говорить о будущем (going to, will)" }
];

export default function HomePage() {
  return (
    <AppShell>
      <main className="page-main">
        <div className="container">
          <section className="section-copy">
            <h1>ПЛАН ИЗУЧЕНИЯ АНГЛИЙСКОГО ЯЗЫКА</h1>
            <p>
              Добро пожаловать в новую платформу Magic English Academy. Мы
              сохраняем привычный стиль курса и переносим обучение внутрь сайта:
              уроки, практика, прогресс и словарь уже работают в одном месте.
            </p>
            <div className="indet-grid">
              <span>
                <strong>Профиль ученика</strong> - текущий уровень, завершённые
                уроки и следующий шаг.
              </span>
              <span>
                <strong>Интерактивный курс</strong> - теория, примеры и задания
                с мгновенной проверкой.
              </span>
              <span>
                <strong>Админка</strong> - редактор уроков, словарь и контроль
                миграции без ручной правки HTML.
              </span>
            </div>
            <MagicButton href="/courses" variant="dark">
              Перейти к плану
            </MagicButton>
          </section>

          <section className="soft-card">
            <h2>Курс по уровням CEFR</h2>
            <p>
              Откройте уровень, выберите урок и проходите материал в своём
              темпе. Статус сохраняется в личном кабинете.
            </p>
            <ChecklistPreview items={previewTopics} />
          </section>
        </div>
      </main>
    </AppShell>
  );
}
