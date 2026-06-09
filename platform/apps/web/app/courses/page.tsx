import { AppShell } from "../../components/AppShell";
import { LevelCard } from "../../components/LevelCard";
import { getCourseInventory, getLevelEmoji } from "../../lib/courses";

export default async function CoursesPage() {
  const inventory = await getCourseInventory();

  return (
    <AppShell>
      <main className="page-main">
        <div className="container">
          <section className="section-copy">
            <h1>ПЛАН ИЗУЧЕНИЯ АНГЛИЙСКОГО ЯЗЫКА</h1>
            <p>
              Карточки уровней остаются в стиле текущего сайта. В следующем
              шаге каждая карточка будет вести не на Notion, а на native-уроки,
              задания и сохраненный прогресс.
            </p>
          </section>

          <section className="levels-container" aria-label="Уровни курса">
            {inventory.levels.map((level) => (
              <LevelCard
                code={level.code}
                emoji={getLevelEmoji(level.code)}
                key={level.code}
                lessons={level.lessonCount}
                title={level.title}
                topics={level.sampleTopics}
              />
            ))}
          </section>
        </div>
      </main>
    </AppShell>
  );
}
