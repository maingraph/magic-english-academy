import { notFound } from "next/navigation";
import { AppShell } from "../../../../../components/AppShell";
import { LessonBlockRenderer } from "../../../../../components/LessonBlockRenderer";
import { LessonProgressPanel } from "../../../../../components/LessonProgressPanel";
import { MagicButton } from "../../../../../components/MagicButton";
import { getNativeLesson } from "../../../../../lib/courses";

type LessonPageProps = {
  params: Promise<{
    level: string;
    lesson: string;
  }>;
};

export default async function LessonPage({ params }: LessonPageProps) {
  const { level, lesson } = await params;
  const data = await getNativeLesson(lesson);

  if (!data || data.level.code.toLowerCase() !== level.toLowerCase()) {
    notFound();
  }

  return (
    <AppShell>
      <main className="page-main">
        <div className="container">
          <section className="lesson-hero">
            <span className="admin-kicker">
              CEFR {data.level.code} · {data.module.title}
            </span>
            <h1>{data.title}</h1>
            <p>{data.summary}</p>
            <div className="lesson-actions">
              <MagicButton href={`/courses/${data.level.code.toLowerCase()}`} variant="light">
                Назад к уровню
              </MagicButton>
              <MagicButton href="/dashboard" variant="dark">
                Мой прогресс
              </MagicButton>
            </div>
          </section>

          <div className="lesson-layout">
            <article className="lesson-content">
              {data.blocks.map((block) => (
                <LessonBlockRenderer block={block} key={`${block.type}-${block.orderIndex}`} />
              ))}
            </article>

            <aside className="lesson-sidebar">
              <div className="soft-card">
                <LessonProgressPanel
                  initialStatus={data.progress.status}
                  slug={data.slug}
                />
              </div>
            </aside>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
