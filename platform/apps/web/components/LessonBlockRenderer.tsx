import { LessonTaskBlock } from "./LessonTaskBlock";
import { SaveWordButton } from "./SaveWordButton";

type LessonBlock = {
  type:
    | "RICH_TEXT"
    | "EXAMPLE"
    | "MEDIA"
    | "TASK"
    | "ASSESSMENT"
    | "DICTIONARY_TERM";
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

function getVideoEmbedUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") {
      return `https://www.youtube-nocookie.com/embed/${url.pathname.slice(1)}`;
    }
    if (url.hostname.endsWith("youtube.com")) {
      const id = url.searchParams.get("v") ?? url.pathname.split("/").at(-1);
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (url.hostname.endsWith("vimeo.com")) {
      const id = url.pathname.split("/").filter(Boolean).at(-1);
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function LessonBlockRenderer({
  block,
  lessonSlug
}: {
  block: LessonBlock;
  lessonSlug: string;
}) {
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

  if (block.type === "TASK" || block.type === "ASSESSMENT") {
    const options = getStringArray(content, "options");

    return (
      <LessonTaskBlock
        answer={getString(content, "answer")}
        blockOrder={block.orderIndex}
        checkpoint={block.type === "ASSESSMENT"}
        lessonSlug={lessonSlug}
        options={options}
        prompt={getString(content, "prompt")}
        title={getString(content, "title")}
      />
    );
  }

  if (block.type === "DICTIONARY_TERM") {
    const examples = getStringArray(content, "examples");

    return (
      <section className="lesson-block dictionary-block">
        <span className="admin-kicker">Словарь</span>
        <h2>{getString(content, "term") || "Термин"}</h2>
        <strong>{getString(content, "translation")}</strong>
        <p>{getString(content, "definition")}</p>
        {examples.length > 0 ? (
          <ul>
            {examples.map((example) => (
              <li key={example}>{example}</li>
            ))}
          </ul>
        ) : null}
        <SaveWordButton
          definition={getString(content, "definition")}
          lessonSlug={lessonSlug}
          term={getString(content, "term")}
          translation={getString(content, "translation")}
        />
      </section>
    );
  }

  if (block.type === "MEDIA") {
    const url = getString(content, "url");
    const mediaType = getString(content, "mediaType");
    const embedUrl = getVideoEmbedUrl(url);
    const isVideoFile = mediaType === "video" || /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
    const isAudioFile = mediaType === "audio" || /\.(mp3|wav|m4a|aac)(\?.*)?$/i.test(url);

    return (
      <section className="lesson-block media-block">
        <h2>{getString(content, "title") || "Материал"}</h2>
        <p>{getString(content, "caption")}</p>
        {embedUrl ? (
          <div className="lesson-video">
            <iframe
              src={embedUrl}
              title={getString(content, "title") || "Видео урока"}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : isVideoFile ? (
          <video className="lesson-video-file" controls preload="metadata">
            <source src={url} />
          </video>
        ) : isAudioFile ? (
          <audio controls preload="metadata">
            <source src={url} />
          </audio>
        ) : (
          <a href={url} download={getString(content, "downloadName") || undefined} rel="noreferrer" target="_blank">
            {getString(content, "downloadName") ? "Скачать материал" : "Открыть материал"}
          </a>
        )}
      </section>
    );
  }

  return (
    <section className="lesson-block">
      <h2>{getString(content, "heading") || "Материал урока"}</h2>
      <p>{getString(content, "text") || getString(content, "kind")}</p>
    </section>
  );
}
