import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/auth/password";

const prisma = new PrismaClient();

const demoStudents = [
  {
    email: "anna.demo@magic.local",
    displayName: "Анна Смирнова",
    taskCorrect: 7,
    taskWrong: 1,
    activeDays: 5
  },
  {
    email: "max.demo@magic.local",
    displayName: "Максим Орлов",
    taskCorrect: 5,
    taskWrong: 2,
    activeDays: 4
  },
  {
    email: "sofia.demo@magic.local",
    displayName: "София Левина",
    taskCorrect: 4,
    taskWrong: 1,
    activeDays: 3
  }
];

async function main() {
  const lesson = await prisma.lesson.findUniqueOrThrow({
    where: { slug: "a1-001" }
  });
  const task = await prisma.task.upsert({
    where: {
      id: "demo-a1-task"
    },
    create: {
      id: "demo-a1-task",
      lessonId: lesson.id,
      type: "MULTIPLE_CHOICE",
      prompt: {
        prompt: "She ___ a teacher.",
        blockOrder: 3
      },
      points: 10,
      isCheckpoint: true,
      orderIndex: 3
    },
    update: {
      lessonId: lesson.id,
      points: 10,
      isCheckpoint: true
    }
  });

  for (const student of demoStudents) {
    const user = await prisma.user.upsert({
      where: { email: student.email },
      create: {
        email: student.email,
        passwordHash: await hashPassword("MagicDemo123!"),
        role: "STUDENT",
        profile: {
          create: {
            displayName: student.displayName
          }
        }
      },
      update: {
        status: "ACTIVE",
        profile: {
          upsert: {
            create: { displayName: student.displayName },
            update: { displayName: student.displayName }
          }
        }
      }
    });

    await prisma.taskAttempt.deleteMany({
      where: {
        userId: user.id,
        taskId: task.id
      }
    });
    await prisma.activityEvent.deleteMany({
      where: {
        userId: user.id,
        type: "DEMO_STUDY_DAY"
      }
    });

    await prisma.taskAttempt.createMany({
      data: [
        ...Array.from({ length: student.taskCorrect }, (_, index) => ({
          userId: user.id,
          taskId: task.id,
          answer: { value: "is", demoAttempt: index + 1 },
          isCorrect: true,
          pointsEarned: 10,
          feedback: "Верно"
        })),
        ...Array.from({ length: student.taskWrong }, (_, index) => ({
          userId: user.id,
          taskId: task.id,
          answer: { value: "are", demoAttempt: index + 1 },
          isCorrect: false,
          pointsEarned: 0,
          feedback: "Попробуйте ещё раз"
        }))
      ]
    });
    await prisma.activityEvent.createMany({
      data: Array.from({ length: student.activeDays }, (_, index) => ({
        userId: user.id,
        type: "DEMO_STUDY_DAY",
        createdAt: new Date(Date.now() - index * 24 * 60 * 60 * 1000)
      }))
    });
  }

  console.log(`Created ${demoStudents.length} presentation students.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
