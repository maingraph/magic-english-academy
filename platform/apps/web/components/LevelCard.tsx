import { MagicButton } from "./MagicButton";

type LevelCardProps = {
  code: string;
  title: string;
  lessons: number;
  topics: string[];
  emoji: string;
};

export function LevelCard({ code, title, lessons, topics, emoji }: LevelCardProps) {
  return (
    <article className="level-block">
      <span className="level-emoji" aria-hidden="true">
        {emoji}
      </span>
      <div className="level-header">
        <h2 className="level-title">CEFR - {code}</h2>
        <p className="level-subtitle">{title}</p>
      </div>
      <ul className="topics-list">
        {topics.map((topic) => (
          <li key={topic}>{topic}</li>
        ))}
        <li>... ({lessons} тем)</li>
      </ul>
      <MagicButton href={`/courses/${code.toLowerCase()}`} variant="dark">
        ПЕРЕЙТИ НА УРОВЕНЬ
      </MagicButton>
    </article>
  );
}
