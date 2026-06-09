type ChecklistPreviewProps = {
  items: Array<{
    title: string;
    completed?: boolean;
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
            <span className="item-text">{item.title}</span>
          </span>
          <button className="view-btn" type="button">
            <span className="view-icon" />
            <span>Посмотреть</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
