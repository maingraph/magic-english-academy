import Link from "next/link";
import { AppShell } from "../../components/AppShell";

type Article = {
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string | null;
};

const apiBaseUrl =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000/api";

export default async function ArticlesPage() {
  const response = await fetch(`${apiBaseUrl}/articles`, {
    next: { revalidate: 60 }
  }).catch(() => null);
  const articles = response?.ok ? ((await response.json()) as Article[]) : [];

  return (
    <AppShell showBanner={false}>
      <main className="page-main">
        <div className="container">
          <section className="section-copy">
            <h1>СТАТЬИ MAGIC ENGLISH</h1>
            <p>Учебные материалы, новости курса и полезные советы.</p>
          </section>
          <div className="public-article-list">
            {articles.map((article) => (
              <article key={article.slug}>
                <span>
                  {article.publishedAt
                    ? new Date(article.publishedAt).toLocaleDateString("ru-RU")
                    : "Статья"}
                </span>
                <h2>{article.title}</h2>
                <p>{article.excerpt}</p>
                <Link href={`/articles/${article.slug}`}>Читать статью →</Link>
              </article>
            ))}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
