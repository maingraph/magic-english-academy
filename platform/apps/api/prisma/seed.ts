import { PrismaClient } from "@prisma/client";
import { courseLevels } from "../src/courses/course-seed";

const prisma = new PrismaClient();

function buildLessonTitle(level: (typeof courseLevels)[number], index: number) {
  return level.sampleTopics[index] ?? `Урок ${index + 1}`;
}

async function main() {
  const course = await prisma.course.upsert({
    where: { slug: "magic-english-main" },
    create: {
      slug: "magic-english-main",
      title: "Magic English",
      description: "Native platform course structure seeded from the legacy course audit."
    },
    update: {
      title: "Magic English",
      description: "Native platform course structure seeded from the legacy course audit."
    }
  });

  for (const [levelIndex, level] of courseLevels.entries()) {
    const courseLevel = await prisma.courseLevel.upsert({
      where: {
        courseId_code: {
          courseId: course.id,
          code: level.code
        }
      },
      create: {
        courseId: course.id,
        code: level.code,
        title: level.title,
        orderIndex: levelIndex + 1
      },
      update: {
        title: level.title,
        orderIndex: levelIndex + 1
      }
    });

    await prisma.module.deleteMany({
      where: { levelId: courseLevel.id }
    });

    await prisma.module.create({
      data: {
        levelId: courseLevel.id,
        title: "Legacy migration",
        orderIndex: 1,
        lessons: {
          create: Array.from({ length: level.lessonCount }, (_, lessonIndex) => {
            const title = buildLessonTitle(level, lessonIndex);

            return {
              slug: `${level.code.toLowerCase()}-${String(lessonIndex + 1).padStart(3, "0")}`,
              title,
              summary: lessonIndex < level.sampleTopics.length
                ? "Seeded from the audited legacy course structure."
                : "Placeholder for migrated Notion lesson content.",
              orderIndex: lessonIndex + 1,
              blocks: {
                create: [
                  {
                    type: "RICH_TEXT",
                    orderIndex: 1,
                    content: {
                      kind: "migration-note",
                      text: "This lesson slot is ready for native course content migration."
                    }
                  }
                ]
              }
            };
          })
        }
      }
    });
  }

  console.log(`Seeded ${courseLevels.length} course levels into ${course.slug}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
