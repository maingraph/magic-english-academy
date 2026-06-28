import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/auth/password";
import { courseLevels } from "../src/courses/course-seed";

const prisma = new PrismaClient();

function buildLessonTitle(level: (typeof courseLevels)[number], index: number) {
  return level.sampleTopics[index] ?? `Урок ${index + 1}`;
}

function buildLessonBlocks(levelCode: string, lessonIndex: number) {
  const a1Lessons = [
    [
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
    ],
    [
      {
        type: "RICH_TEXT" as const,
        orderIndex: 1,
        content: {
          heading: "Кто выполняет действие",
          text: "Личные местоимения заменяют имена и предметы: I, you, he, she, it, we, they."
        }
      },
      {
        type: "EXAMPLE" as const,
        orderIndex: 2,
        content: {
          title: "Замена существительного",
          items: [
            "Anna is a teacher. She is a teacher.",
            "Tom and I are friends. We are friends.",
            "The books are new. They are new."
          ]
        }
      },
      {
        type: "TASK" as const,
        orderIndex: 3,
        content: {
          title: "Выберите местоимение",
          prompt: "Mike is from London. ___ is British.",
          options: ["He", "She", "They"],
          answer: "He"
        }
      }
    ],
    [
      {
        type: "RICH_TEXT" as const,
        orderIndex: 1,
        content: {
          heading: "Регулярные действия",
          text: "Present Simple описывает привычки и факты. С I, you, we, they используйте начальную форму глагола; с he, she, it добавьте -s."
        }
      },
      {
        type: "EXAMPLE" as const,
        orderIndex: 2,
        content: {
          title: "Утверждения",
          items: [
            "I work every day.",
            "She works every day.",
            "They live in Warsaw."
          ]
        }
      },
      {
        type: "TASK" as const,
        orderIndex: 3,
        content: {
          title: "Проверьте правило",
          prompt: "He ___ English every evening.",
          options: ["study", "studies", "studying"],
          answer: "studies"
        }
      }
    ],
    [
      {
        type: "RICH_TEXT" as const,
        orderIndex: 1,
        content: {
          heading: "Слова для первого разговора",
          text: "Начните с частых слов о семье, доме и повседневных действиях. Запоминайте их внутри коротких фраз."
        }
      },
      {
        type: "DICTIONARY_TERM" as const,
        orderIndex: 2,
        content: {
          term: "family",
          translation: "семья",
          definition: "A group of people related to one another.",
          examples: ["I have a big family.", "My family lives in Minsk."]
        }
      },
      {
        type: "TASK" as const,
        orderIndex: 3,
        content: {
          title: "Подберите перевод",
          prompt: "Как переводится слово family?",
          options: ["работа", "семья", "город"],
          answer: "семья"
        }
      }
    ]
  ];

  if (levelCode === "A1" && lessonIndex < a1Lessons.length) {
    const blocks = a1Lessons[lessonIndex];

    return [
      ...blocks,
      {
        type: "ASSESSMENT" as const,
        orderIndex: blocks.length + 1,
        content: {
          title: "Задание для проверки",
          prompt:
            lessonIndex === 0
              ? "Выбери правильную форму: They ___ ready."
              : "Выбери лучший ответ по теме урока.",
          options: lessonIndex === 0 ? ["am", "is", "are"] : ["Первый вариант", "Второй вариант", "Третий вариант"],
          answer: lessonIndex === 0 ? "are" : "Первый вариант"
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
        text: "Этот урок готов к переносу материалов курса."
      }
    }
  ];
}

async function main() {
  await prisma.user.upsert({
    where: { email: "student@magic.local" },
    create: {
      email: "student@magic.local",
      passwordHash: await hashPassword("MagicStudent123!"),
      role: "STUDENT",
      profile: {
        create: {
          displayName: "Ученик Magic English"
        }
      }
    },
    update: {
      passwordHash: await hashPassword("MagicStudent123!"),
      role: "STUDENT",
      status: "ACTIVE",
      profile: {
        upsert: {
          create: {
            displayName: "Ученик Magic English"
          },
          update: {
            displayName: "Ученик Magic English"
          }
        }
      }
    }
  });

  await prisma.user.upsert({
    where: { email: "admin@magic.local" },
    create: {
      email: "admin@magic.local",
      passwordHash: await hashPassword("MagicAdmin123!"),
      role: "ADMIN",
      profile: {
        create: {
          displayName: "Администратор"
        }
      }
    },
    update: {
      passwordHash: await hashPassword("MagicAdmin123!"),
      role: "ADMIN",
      status: "ACTIVE",
      profile: {
        upsert: {
          create: {
            displayName: "Администратор"
          },
          update: {
            displayName: "Администратор"
          }
        }
      }
    }
  });

  await prisma.dictionaryTerm.upsert({
    where: { id: "seed-to-be" },
    create: {
      id: "seed-to-be",
      term: "to be",
      translation: "быть, являться",
      definition: "Глагол для описания человека, состояния или места.",
      examples: ["I am a student.", "She is happy."]
    },
    update: {
      term: "to be",
      translation: "быть, являться",
      definition: "Глагол для описания человека, состояния или места.",
      examples: ["I am a student.", "She is happy."]
    }
  });

  await prisma.achievement.upsert({
    where: { code: "FIRST_LESSON" },
    create: {
      code: "FIRST_LESSON",
      title: "Первый шаг",
      description: "Завершите первый урок.",
      rule: { type: "completed_lessons", target: 1 }
    },
    update: {}
  });

  await prisma.article.upsert({
    where: { slug: "how-to-study-with-magic-english" },
    create: {
      slug: "how-to-study-with-magic-english",
      title: "Как учиться с Magic English",
      excerpt: "Краткий гид по урокам, практике, домашним работам и прогрессу.",
      content: {
        type: "rich_text",
        text: "Выберите свой уровень CEFR, откройте следующий урок, выполните интерактивные задания и отправьте домашнюю работу. Прогресс, баллы, словарь и достижения обновляются автоматически."
      },
      status: "PUBLISHED",
      publishedAt: new Date()
    },
    update: {}
  });

  const course = await prisma.course.upsert({
    where: { slug: "magic-english-main" },
    create: {
      slug: "magic-english-main",
      title: "Magic English",
      description: "Структура курса для интерактивной платформы Magic English."
    },
    update: {
      title: "Magic English",
      description: "Структура курса для интерактивной платформы Magic English."
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
        title: "Материалы курса",
        orderIndex: 1,
        lessons: {
          create: Array.from({ length: level.lessonCount }, (_, lessonIndex) => {
            const title = buildLessonTitle(level, lessonIndex);

            return {
              slug: `${level.code.toLowerCase()}-${String(lessonIndex + 1).padStart(3, "0")}`,
              title,
              summary: lessonIndex < level.sampleTopics.length
                ? "Интерактивный урок на основе программы курса."
                : "Место для переноса материалов урока из Notion.",
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
