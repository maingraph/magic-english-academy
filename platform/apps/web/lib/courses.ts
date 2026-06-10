export type CourseLevel = {
  code: string;
  title: string;
  lessonCount: number;
  status: string;
  sampleTopics: string[];
};

export type CourseLevelLessons = {
  code: string;
  title: string;
  lessonCount: number;
  modules: Array<{
    title: string;
    orderIndex: number;
    lessons: Array<{
      slug: string;
      title: string;
      summary: string | null;
      orderIndex: number;
      status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
    }>;
  }>;
};

export type NativeLesson = {
  slug: string;
  title: string;
  summary: string | null;
  orderIndex: number;
  level: {
    code: string;
    title: string;
  };
  module: {
    title: string;
    orderIndex: number;
  };
  blocks: Array<{
    type: "RICH_TEXT" | "EXAMPLE" | "MEDIA" | "TASK" | "DICTIONARY_TERM";
    orderIndex: number;
    content: unknown;
  }>;
  progress: {
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
    completedAt: string | null;
    updatedAt: string | null;
  };
};

type CourseInventory = {
  source: string;
  totalLessons: number;
  levels: CourseLevel[];
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

const fallbackLevels: CourseLevel[] = [
  {
    code: "A1",
    title: "Beginner",
    lessonCount: 41,
    status: "legacy-static-audit",
    sampleTopics: [
      "Глагол to be (am/is/are)",
      "Личные местоимения",
      "Present Simple",
      "Базовая лексика"
    ]
  },
  {
    code: "A2",
    title: "Pre-Intermediate",
    lessonCount: 28,
    status: "legacy-static-audit",
    sampleTopics: [
      "Present Continuous",
      "Past Simple",
      "Future forms",
      "Modal verbs"
    ]
  },
  {
    code: "B1",
    title: "Intermediate",
    lessonCount: 26,
    status: "legacy-static-audit",
    sampleTopics: [
      "Future Simple",
      "Present Perfect",
      "Past Continuous",
      "Reported Speech"
    ]
  },
  {
    code: "B2",
    title: "Upper-Intermediate",
    lessonCount: 32,
    status: "legacy-static-audit",
    sampleTopics: [
      "Perfect Continuous",
      "Conditionals",
      "Modal deduction",
      "Cleft sentences"
    ]
  },
  {
    code: "C1",
    title: "Advanced",
    lessonCount: 37,
    status: "legacy-static-audit",
    sampleTopics: [
      "Inversion for emphasis",
      "Fronting",
      "Academic phrases",
      "Register shifting"
    ]
  }
];

const levelEmoji: Record<string, string> = {
  A1: "🇺🇸",
  A2: "🔥",
  B1: "😎",
  B2: "📚",
  C1: "🎓"
};

export function getLevelEmoji(code: string) {
  return levelEmoji[code.toUpperCase()] ?? "📘";
}

export function getFallbackLevels() {
  return fallbackLevels;
}

export async function getCourseInventory(): Promise<CourseInventory> {
  try {
    const response = await fetch(`${apiBaseUrl}/courses/levels`, {
      next: { revalidate: 30 }
    });

    if (!response.ok) {
      throw new Error(`Course inventory failed: ${response.status}`);
    }

    return (await response.json()) as CourseInventory;
  } catch {
    return {
      source: "frontend-fallback",
      totalLessons: fallbackLevels.reduce((sum, level) => sum + level.lessonCount, 0),
      levels: fallbackLevels
    };
  }
}

export async function getCourseLevel(code: string): Promise<CourseLevel | null> {
  const inventory = await getCourseInventory();

  return inventory.levels.find(
    (level) => level.code.toLowerCase() === code.toLowerCase()
  ) ?? null;
}

export async function getCourseLevelLessons(code: string): Promise<CourseLevelLessons | null> {
  try {
    const response = await fetch(`${apiBaseUrl}/courses/levels/${code}/lessons`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Course level lessons failed: ${response.status}`);
    }

    return (await response.json()) as CourseLevelLessons;
  } catch {
    return null;
  }
}

export async function getNativeLesson(slug: string): Promise<NativeLesson | null> {
  try {
    const response = await fetch(`${apiBaseUrl}/courses/lessons/${slug}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Native lesson failed: ${response.status}`);
    }

    return (await response.json()) as NativeLesson;
  } catch {
    return null;
  }
}
