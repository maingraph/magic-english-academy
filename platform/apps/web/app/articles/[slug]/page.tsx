import { notFound } from "next/navigation";
import { AppShell } from "../../../components/AppShell";

type Article = {
  slug: string;
  title: string;
  excerpt: string | null;
  content: unknown;
  publishedAt: string | null;
};

const apiBaseUrl =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000/api";

function contentText(content: unknown) {
  if (
    content &&
    typeof content === "object" &&
    !Array.isArray(content) &&
    "text" in content &&
    typeof content.text === "string"
  ) {
    return content.text;
  }

  return "";
}

export default async function ArticlePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const response = await fetch(`${apiBaseUrl}/articles/${slug}`, {
    next: { revalidate: 60 }
  }).catch(() => null);

  if (!response?.ok) notFound();
  const article = (await response.json()) as Article;

  return (
    <AppShell showBanner={false}>
      <main className="page-main">
        <article className="public-article">
          <span>
            {article.publishedAt
              ? new Date(article.publishedAt).toLocaleDateString("ru-RU")
              : "Magic English"}
          </span>
          <h1>{article.title}</h1>
          {article.excerpt ? <strong>{article.excerpt}</strong> : null}
          <div>{contentText(article.content)}</div>
        </article>
      </main>
    </AppShell>
  );
}
