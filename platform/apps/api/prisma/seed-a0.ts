import type { PrismaClient } from "@prisma/client";

const modules = [
  {
    id: "a0-module-sounds",
    title: "Первые звуки",
    skill: "listening",
    lessons: [
      ["Алфавит", "Узнаём 26 букв и их названия.", "letter", "буква", "Какая буква идёт после A?", ["B", "D", "E"], "B"],
      ["Базовые звуки", "Слышим разницу между частыми английскими звуками.", "sound", "звук", "Какое слово начинается со звука /b/?", ["book", "cat", "tea"], "book"],
      ["Как произнести имя по буквам", "Учимся медленно называть буквы своего имени.", "spell", "произносить по буквам", "Что значит spell your name?", ["Назвать имя по буквам", "Написать адрес", "Поздороваться"], "Назвать имя по буквам"],
      ["Фразы на уроке", "Просим повторить и говорим, что не поняли.", "repeat", "повторить", "Как попросить повторить?", ["Please repeat.", "Good night.", "I am ten."], "Please repeat."]
    ]
  },
  {
    id: "a0-module-about-me",
    title: "О себе",
    skill: "speaking",
    lessons: [
      ["Приветствия", "Здороваемся и прощаемся в разных ситуациях.", "hello", "привет", "Что сказать при встрече?", ["Hello!", "Thanks.", "Blue."], "Hello!"],
      ["I am / you are", "Строим первые фразы о себе и собеседнике.", "I am", "я — / я являюсь", "Выбери: I ___ Anna.", ["am", "is", "are"], "am"],
      ["Страны и языки", "Говорим, откуда мы и на каком языке говорим.", "country", "страна", "Выбери: I am ___ Poland.", ["from", "at", "on"], "from"],
      ["Числа и возраст", "Считаем и называем свой возраст.", "age", "возраст", "Как спросить возраст?", ["How old are you?", "Where are you?", "What color?"], "How old are you?"]
    ]
  },
  {
    id: "a0-module-situations",
    title: "Первые ситуации",
    skill: "vocabulary",
    lessons: [
      ["Дни и время", "Называем дни недели и простое время.", "today", "сегодня", "Как переводится today?", ["сегодня", "завтра", "вчера"], "сегодня"],
      ["Предметы и цвета", "Описываем простые предметы вокруг нас.", "color", "цвет", "Выбери: It is a ___ pen.", ["blue", "Monday", "seven"], "blue"],
      ["Простые нужды и вопросы", "Просим воду, помощь и уточнение.", "need", "нуждаться", "Как сказать «Мне нужна помощь»?", ["I need help.", "I am help.", "Help is blue."], "I need help."],
      ["Повторение и итог", "Соединяем всё изученное в первом диалоге.", "ready", "готов", "Выбери лучший ответ: Hello! What is your name?", ["I am Alex.", "It is blue.", "On Monday."], "I am Alex."]
    ]
  }
] as const;

export async function seedA0(prisma: PrismaClient, courseId: string, orderIndex = 0) {
  const level = await prisma.courseLevel.upsert({
    where: { courseId_code: { courseId, code: "A0" } },
    create: { courseId, code: "A0", title: "С нуля", description: "Первые слова, звуки и ситуации без требований к стартовому уровню.", orderIndex },
    update: { title: "С нуля", description: "Первые слова, звуки и ситуации без требований к стартовому уровню.", orderIndex }
  });

  for (const [moduleIndex, module] of modules.entries()) {
    await prisma.module.upsert({
      where: { id: module.id },
      create: { id: module.id, levelId: level.id, title: module.title, description: "Объяснение, примеры, новые слова, практика и проверка.", skill: module.skill, orderIndex: moduleIndex + 1 },
      update: { levelId: level.id, title: module.title, description: "Объяснение, примеры, новые слова, практика и проверка.", skill: module.skill, orderIndex: moduleIndex + 1 }
    });

    for (const [lessonIndex, source] of module.lessons.entries()) {
      const [title, summary, term, translation, prompt, options, answer] = source;
      const sequence = moduleIndex * 4 + lessonIndex + 1;
      const slug = `a0-${String(sequence).padStart(3, "0")}`;
      const lesson = await prisma.lesson.upsert({
        where: { slug },
        create: { moduleId: module.id, slug, title, summary, orderIndex: lessonIndex + 1, estimatedMinutes: sequence === 12 ? 25 : 15, skill: module.skill },
        update: { moduleId: module.id, title, summary, orderIndex: lessonIndex + 1, estimatedMinutes: sequence === 12 ? 25 : 15, skill: module.skill }
      });
      const blocks = [
        { type: "RICH_TEXT" as const, content: { heading: title, text: summary, tip: "Сначала прочитайте вслух, затем повторите без подсказки." } },
        { type: "EXAMPLE" as const, content: { title: "Примеры", items: sequence === 1 ? ["A — /eɪ/", "B — /biː/", "C — /siː/"] : [`${term} — ${translation}`, `I use “${term}” in a short phrase.`] } },
        { type: "DICTIONARY_TERM" as const, content: { term, translation, examples: [`${term}.`, `Remember: ${term}.`] } },
        { type: "TASK" as const, content: { title: "Практика", prompt, options, answer } },
        { type: "ASSESSMENT" as const, content: { title: sequence === 12 ? "Итоговая проверка A0" : "Проверка шага", prompt, options, answer } }
      ];
      for (const [blockIndex, block] of blocks.entries()) {
        const id = `${slug}-block-${blockIndex + 1}`;
        await prisma.lessonBlock.upsert({
          where: { id },
          create: { id, lessonId: lesson.id, type: block.type, orderIndex: blockIndex + 1, content: block.content },
          update: { lessonId: lesson.id, type: block.type, orderIndex: blockIndex + 1, content: block.content }
        });
      }
      const taskId = `${slug}-checkpoint`;
      await prisma.task.upsert({
        where: { id: taskId },
        create: { id: taskId, lessonId: lesson.id, type: "MULTIPLE_CHOICE", prompt: { text: prompt }, points: sequence === 12 ? 10 : 2, isCheckpoint: true, orderIndex: 1 },
        update: { lessonId: lesson.id, prompt: { text: prompt }, points: sequence === 12 ? 10 : 2, isCheckpoint: true, orderIndex: 1 }
      });
      for (const [optionIndex, value] of options.entries()) {
        const id = `${taskId}-option-${optionIndex + 1}`;
        await prisma.taskOption.upsert({
          where: { id },
          create: { id, taskId, value, isCorrect: value === answer },
          update: { taskId, value, isCorrect: value === answer }
        });
      }
    }
  }
}

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const course = await prisma.course.upsert({
      where: { slug: "magic-english-main" },
      create: { slug: "magic-english-main", title: "Magic English" },
      update: {}
    });
    await seedA0(prisma, course.id, 0);
    console.log("A0: 3 modules and 12 lessons are ready.");
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("seed-a0.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
