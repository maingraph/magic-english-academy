import { AppShell } from "../components/AppShell";
import { ChecklistPreview } from "../components/ChecklistPreview";
import { MagicButton } from "../components/MagicButton";

const previewTopics = [
  { title: "Глагол to be (am/is/are)", completed: true },
  { title: "Present Simple" },
  { title: "Future forms (going to, will)" }
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
              уроки, задания, прогресс, домашка, словарик и достижения будут
              жить в одном месте.
            </p>
            <div className="indet-grid">
              <span>
                <strong>Профиль ученика</strong> - прогресс, уровень, домашка и
                сертификаты.
              </span>
              <span>
                <strong>Интерактивный курс</strong> - задания, попытки,
                правильность и баллы.
              </span>
              <span>
                <strong>Админка</strong> - курс, статьи, пользователи и метрики
                без ручной правки HTML.
              </span>
            </div>
            <MagicButton href="/courses" variant="dark">
              Перейти к плану
            </MagicButton>
          </section>

          <section className="soft-card">
            <h2>Первый reusable-блок курса</h2>
            <p>
              Чеклист остается визуально знакомым, но теперь это компонент,
              который можно подключать к базе данных, прогрессу и интерактивным
              заданиям.
            </p>
            <ChecklistPreview items={previewTopics} />
          </section>
        </div>
      </main>
    </AppShell>
  );
}
