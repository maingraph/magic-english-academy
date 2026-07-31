import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { AppShell } from "../../../../../components/AppShell";
import { AuthGate } from "../../../../../components/AuthGate";
import { LessonBlockRenderer } from "../../../../../components/LessonBlockRenderer";
import { LessonProgressPanel } from "../../../../../components/LessonProgressPanel";
import { LessonToolbar } from "../../../../../components/LessonToolbar";
import { MagicButton } from "../../../../../components/MagicButton";
import { TextSelectionTools } from "../../../../../components/TextSelectionTools";
import { getNativeLesson } from "../../../../../lib/courses";

type LessonPageProps = {
  params: Promise<{
    level: string;
    lesson: string;
  }>;
};

export default async function LessonPage({ params }: LessonPageProps) {
  const { level, lesson } = await params;
  const cookieHeader = (await cookies()).toString();
  const data = await getNativeLesson(lesson, cookieHeader);

  if (!data || data.level.code.toLowerCase() !== level.toLowerCase()) {
    notFound();
  }

  const lessonBlocks = data.blocks.filter((block) => block.type !== "ASSESSMENT");
  const assessmentBlocks = data.blocks.filter((block) => block.type === "ASSESSMENT");

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
          <LessonToolbar slug={data.slug} />

          <div className="lesson-layout">
            <article className="lesson-content">
              {lessonBlocks.map((block) => (
                <LessonBlockRenderer
                  block={block}
                  key={`${block.type}-${block.orderIndex}`}
                  lessonSlug={data.slug}
                />
              ))}
              {assessmentBlocks.length > 0 ? (
                <section className="lesson-assessment-group">
                  <div className="panel-heading">
                    <div>
                      <span>После урока</span>
                      <h2>Задания для проверки</h2>
                    </div>
                  </div>
                  {assessmentBlocks.map((block) => (
                    <LessonBlockRenderer
                      block={block}
                      key={`${block.type}-${block.orderIndex}`}
                      lessonSlug={data.slug}
                    />
                  ))}
                </section>
              ) : null}
            </article>

            <aside className="lesson-sidebar">
              <div className="soft-card">
                <AuthGate>
                  <LessonProgressPanel
                    initialStatus={data.progress.status}
                    slug={data.slug}
                  />
                </AuthGate>
              </div>
            </aside>
          </div>
          <TextSelectionTools lessonSlug={data.slug} />
        </div>
      </main>
    </AppShell>
  );
}
