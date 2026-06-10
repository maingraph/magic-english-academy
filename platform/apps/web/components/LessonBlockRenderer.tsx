type LessonBlock = {
  type: "RICH_TEXT" | "EXAMPLE" | "MEDIA" | "TASK" | "DICTIONARY_TERM";
  orderIndex: number;
  content: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: Record<string, unknown>, key: string) {
  return typeof value[key] === "string" ? value[key] : "";
}

function getStringArray(value: Record<string, unknown>, key: string) {
  return Array.isArray(value[key])
    ? value[key].filter((item): item is string => typeof item === "string")
    : [];
}

export function LessonBlockRenderer({ block }: { block: LessonBlock }) {
  const content = isRecord(block.content) ? block.content : {};

  if (block.type === "EXAMPLE") {
    const items = getStringArray(content, "items");

    return (
      <section className="lesson-block example-block">
        <h2>{getString(content, "title") || "Пример"}</h2>
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    );
  }

  if (block.type === "TASK") {
    const options = getStringArray(content, "options");

    return (
      <section className="lesson-block task-block">
        <span className="admin-kicker">Практика</span>
        <h2>{getString(content, "title") || "Задание"}</h2>
        <p>{getString(content, "prompt")}</p>
        <div className="lesson-options">
          {options.map((option) => (
            <button className="lesson-option" key={option} type="button">
              {option}
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="lesson-block">
      <h2>{getString(content, "heading") || "Материал урока"}</h2>
      <p>{getString(content, "text") || getString(content, "text") || getString(content, "kind")}</p>
    </section>
  );
}
