import Link from "next/link";

type ChecklistPreviewProps = {
  items: Array<{
    title: string;
    completed?: boolean;
    href?: string;
    meta?: string;
  }>;
};

export function ChecklistPreview({ items }: ChecklistPreviewProps) {
  return (
    <ul className="grammar-checklist">
      {items.map((item) => (
        <li
          className={`grammar-checklist-item ${item.completed ? "completed" : ""}`}
          key={item.title}
        >
          <span className="checkbox-container">
            <span className={`grammar-checkmark ${item.completed ? "checked" : ""}`} />
            <span className="item-copy">
              <span className="item-text">{item.title}</span>
              {item.meta ? <span className="item-meta">{item.meta}</span> : null}
            </span>
          </span>
          {item.href ? (
            <Link className="view-btn" href={item.href}>
              <span className="view-icon" />
              <span>Открыть</span>
            </Link>
          ) : (
            <button className="view-btn" type="button">
              <span className="view-icon" />
              <span>Посмотреть</span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
