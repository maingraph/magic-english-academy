import { PrismaClient } from "@prisma/client";
import { courseLevels } from "../src/courses/course-seed";

const prisma = new PrismaClient();

function buildLessonTitle(level: (typeof courseLevels)[number], index: number) {
  return level.sampleTopics[index] ?? `Урок ${index + 1}`;
}

function buildLessonBlocks(levelCode: string, lessonIndex: number) {
  if (levelCode === "A1" && lessonIndex === 0) {
    return [
      {
        type: "RICH_TEXT" as const,
        orderIndex: 1,
        content: {
          heading: "Что такое to be",
          text: "Глагол to be помогает сказать, кто мы, где мы и какие мы: I am a student, She is happy, They are at home."
        }
      },
      {
        type: "EXAMPLE" as const,
        orderIndex: 2,
        content: {
          title: "Формы",
          items: [
            "I am - я есть / я являюсь",
            "He, she, it is - он, она, оно есть",
            "You, we, they are - ты/вы, мы, они есть"
          ]
        }
      },
      {
        type: "TASK" as const,
        orderIndex: 3,
        content: {
          title: "Мини-практика",
          prompt: "Выбери правильную форму: She ___ a teacher.",
          options: ["am", "is", "are"],
          answer: "is"
        }
      }
    ];
  }

  return [
    {
      type: "RICH_TEXT" as const,
      orderIndex: 1,
      content: {
        kind: "migration-note",
        text: "This lesson slot is ready for native course content migration."
      }
    }
  ];
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
                create: buildLessonBlocks(level.code, lessonIndex)
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
