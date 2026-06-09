import { notFound } from "next/navigation";
import { AppShell } from "../../../components/AppShell";
import { ChecklistPreview } from "../../../components/ChecklistPreview";
import { MagicButton } from "../../../components/MagicButton";
import { getCourseLevel, getFallbackLevels } from "../../../lib/courses";

export function generateStaticParams() {
  return getFallbackLevels().map((level) => ({ level: level.code.toLowerCase() }));
}

type LevelPageProps = {
  params: Promise<{
    level: string;
  }>;
};

export default async function LevelPage({ params }: LevelPageProps) {
  const { level } = await params;
  const data = await getCourseLevel(level);

  if (!data) {
    notFound();
  }

  return (
    <AppShell>
      <main className="page-main">
        <div className="container">
          <section className="section-copy">
            <h1>
              CEFR - {data.code} ({data.title})
            </h1>
            <p>
              Будущая страница уровня сохранит чеклист курса, но каждая тема
              станет native-уроком с материалом, заданиями, домашкой и
              прогрессом.
            </p>
            <MagicButton href="/courses" variant="light">
              Назад к плану
            </MagicButton>
          </section>

          <section className="soft-card">
            <h2>Темы уровня</h2>
            <ChecklistPreview
              items={data.sampleTopics.map((topic, index) => ({
                title: topic,
                completed: data.code === "A1" && index === 0
              }))}
            />
          </section>
        </div>
      </main>
    </AppShell>
  );
}
