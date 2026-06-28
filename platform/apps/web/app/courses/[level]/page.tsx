import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { AppShell } from "../../../components/AppShell";
import { ChecklistPreview } from "../../../components/ChecklistPreview";
import { MagicButton } from "../../../components/MagicButton";
import {
  getCourseLevel,
  getCourseLevelLessons,
  getFallbackLevels
} from "../../../lib/courses";

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
  const cookieHeader = (await cookies()).toString();
  const data = await getCourseLevel(level);
  const lessonData = await getCourseLevelLessons(level, cookieHeader);

  if (!data) {
    notFound();
  }

  const lessonItems = lessonData?.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({
      title: lesson.title,
      meta: `${module.title} · ${String(lesson.orderIndex).padStart(2, "0")} · ${
        lesson.status === "COMPLETED"
          ? "готово"
          : lesson.status === "IN_PROGRESS"
            ? "в процессе"
            : "не начато"
      }`,
      href: `/courses/${data.code.toLowerCase()}/lessons/${lesson.slug}`,
      completed: lesson.status === "COMPLETED"
    }))
  );

  return (
    <AppShell>
      <main className="page-main">
        <div className="container">
          <section className="section-copy">
            <h1>
              CEFR - {data.code} ({data.title})
            </h1>
            <p>
              Все темы уровня собраны в одном чеклисте. Открывайте уроки,
              выполняйте задания и возвращайтесь к обучению с сохранённого места.
            </p>
            <MagicButton href="/courses" variant="light">
              Назад к плану
            </MagicButton>
          </section>

          <section className="soft-card">
            <h2>Уроки уровня</h2>
            <ChecklistPreview
              items={lessonItems ?? data.sampleTopics.map((topic, index) => ({
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
