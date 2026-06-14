const legacyArticles = [
  {
    title: "Подарочный урок",
    source: "Gift.html",
    status: "Готов к переносу"
  },
  {
    title: "Инструкция",
    source: "Instruction.html",
    status: "Нужна структура"
  },
  {
    title: "Тестирование",
    source: "Test.html",
    status: "Нужна нативная форма"
  },
  {
    title: "Прогресс",
    source: "Progress.html",
    status: "Связать с платформой"
  }
];

export function AdminArticlePanel() {
  return (
    <section className="soft-card admin-article-panel">
      <div className="admin-section-header">
        <div>
          <span className="admin-kicker">Статьи</span>
          <h2>Материалы и SEO</h2>
          <p>Очередь legacy-страниц, которые нужно превратить в нативные разделы платформы.</p>
        </div>
      </div>

      <div className="article-queue">
        {legacyArticles.map((article) => (
          <article className="article-queue-item" key={article.source}>
            <div>
              <h3>{article.title}</h3>
              <span>{article.source}</span>
            </div>
            <strong>{article.status}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
