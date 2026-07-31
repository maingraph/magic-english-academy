"use client";

import {
  Bookmark,
  Download,
  Eye,
  FileText,
  Heart,
  MessageCircle,
  Paperclip,
  Send,
  Sparkles
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Comment = {
  id: string;
  text: string;
  createdAt: string;
  author: { name: string };
};
type Attachment = {
  id?: string;
  name: string;
  mimeType: string;
  size: number;
  storageKey: string;
  url: string;
};
type Post = {
  id: string;
  title: string;
  text: string;
  publishedAt: string | null;
  createdAt: string;
  pinned: boolean;
  liked: boolean;
  saved: boolean;
  author: { name: string };
  attachments: Attachment[];
  comments: Comment[];
  counts: { likes: number; comments: number; views: number };
  poll: null | { id: string; question: string; selectedOptionId: string | null; options: Array<{ id: string; label: string; votes: number }> };
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

async function readError(response: Response) {
  const data = (await response.json().catch(() => null)) as { message?: string } | null;
  return data?.message ?? "Не удалось выполнить действие";
}

function attachmentUrl(path: string) {
  const apiOrigin = new URL(apiBaseUrl).origin;
  return new URL(path, apiOrigin).toString();
}

function formatDate(value: string | null) {
  if (!value) return "только что";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function FeedWorkspace() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [canPublish, setCanPublish] = useState(false);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [draftFiles, setDraftFiles] = useState<File[]>([]);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [publishStatus, setPublishStatus] = useState<"PUBLISHED" | "DRAFT">("PUBLISHED");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [state, setState] = useState<"loading" | "idle" | "saving" | "error">("loading");
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const viewed = useRef(new Set<string>());

  const load = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/feed`, { credentials: "include" });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as {
        posts: Post[];
        permissions: { canPublish: boolean };
      };
      setPosts(data.posts);
      setCanPublish(data.permissions.canPublish);
      setState("idle");
      for (const post of data.posts) {
        if (viewed.current.has(post.id)) continue;
        viewed.current.add(post.id);
        void fetch(`${apiBaseUrl}/feed/${post.id}/view`, {
          method: "POST",
          credentials: "include"
        });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Лента временно недоступна");
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalViews = useMemo(
    () => posts.reduce((sum, post) => sum + post.counts.views, 0),
    [posts]
  );

  function updatePost(id: string, updater: (post: Post) => Post) {
    setPosts((current) => current.map((post) => (post.id === id ? updater(post) : post)));
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !canPublish || state === "saving") return;
    setState("saving");
    setError("");

    try {
      let attachments: Attachment[] = [];
      attachments = await Promise.all(draftFiles.map(async (file) => {
        const body = new FormData(); body.append("file", file);
        const upload = await fetch(`${apiBaseUrl}/feed/uploads`, { method: "POST", credentials: "include", body });
        if (!upload.ok) throw new Error(await readError(upload));
        return await upload.json() as Attachment;
      }));

      const response = await fetch(`${apiBaseUrl}/feed`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: text.split("\n")[0].slice(0, 180),
          text,
          attachments,
          status: publishStatus,
          isPinned,
          scheduledAt: scheduledAt || null,
          poll: pollQuestion.trim() ? { question: pollQuestion, options: pollOptions.split("\n").map((value) => value.trim()).filter(Boolean) } : undefined
        })
      });
      if (!response.ok) throw new Error(await readError(response));
      const post = (await response.json()) as Post;
      setPosts((current) => [post, ...current]);
      setDraft("");
      setDraftFiles([]); setPollQuestion(""); setPollOptions(""); setScheduledAt(""); setIsPinned(false);
      if (fileInput.current) fileInput.current.value = "";
      setState("idle");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Публикация не сохранена");
      setState("error");
    }
  }

  async function vote(postId: string, pollId: string, optionId: string) {
    const response = await fetch(`${apiBaseUrl}/feed/polls/${pollId}/vote`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ optionId }) });
    if (response.ok) await load(); else setError(await readError(response));
  }

  async function toggle(post: Post, kind: "like" | "bookmark") {
    const response = await fetch(`${apiBaseUrl}/feed/${post.id}/${kind}`, {
      method: "POST",
      credentials: "include"
    });
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    const data = (await response.json()) as { liked?: boolean; saved?: boolean; count?: number };
    updatePost(post.id, (current) => ({
      ...current,
      liked: data.liked ?? current.liked,
      saved: data.saved ?? current.saved,
      counts: {
        ...current.counts,
        likes: data.count ?? current.counts.likes
      }
    }));
  }

  async function addComment(event: FormEvent, postId: string) {
    event.preventDefault();
    const text = commentDrafts[postId]?.trim();
    if (!text) return;
    const response = await fetch(`${apiBaseUrl}/feed/${postId}/comments`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text })
    });
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    const comment = (await response.json()) as Comment;
    updatePost(postId, (post) => ({
      ...post,
      comments: [...post.comments, comment],
      counts: { ...post.counts, comments: post.counts.comments + 1 }
    }));
    setCommentDrafts((current) => ({ ...current, [postId]: "" }));
  }

  return (
    <div className="social-feed">
      <header className="social-feed-header">
        <div>
          <span>Magic Community</span>
          <h1>Лента</h1>
          <p>Новости курса, материалы и обсуждения — в одном спокойном потоке.</p>
        </div>
        <div className="feed-stat">
          <Eye size={17} />
          <strong>{totalViews.toLocaleString("ru-RU")}</strong>
          <span>просмотров</span>
        </div>
      </header>

      {canPublish ? (
        <form className="feed-composer" onSubmit={publish}>
          <span className="feed-avatar"><Sparkles size={20} /></span>
          <label>
            <span className="sr-only">Текст публикации</span>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Поделиться новостью или материалом..."
              rows={2}
              maxLength={12000}
            />
            <span className="composer-footer">
              <button className="composer-attach" onClick={() => fileInput.current?.click()} type="button">
                <Paperclip size={17} />
                {draftFiles.length ? `${draftFiles.length} файл(а)` : "Прикрепить файлы"}
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".pdf,.txt,.csv,.jpg,.jpeg,.png,.webp,.mp3,.ogg,.mp4,.webm"
                multiple
                onChange={(event) => setDraftFiles(Array.from(event.target.files ?? []).slice(0, 8))}
                hidden
              />
              <button className="composer-send" disabled={!draft.trim() || state === "saving"} type="submit">
                <Send size={16} />
                {state === "saving" ? "Сохраняем…" : "Опубликовать"}
              </button>
            </span>
            <details className="composer-advanced"><summary>Опрос, расписание и публикация</summary><div><input value={pollQuestion} onChange={(event) => setPollQuestion(event.target.value)} placeholder="Вопрос опроса" /><textarea value={pollOptions} onChange={(event) => setPollOptions(event.target.value)} placeholder={'Варианты — каждый с новой строки'} rows={3} /><label>Опубликовать<input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></label><label><input type="checkbox" checked={isPinned} onChange={(event) => setIsPinned(event.target.checked)} />Закрепить</label><select value={publishStatus} onChange={(event) => setPublishStatus(event.target.value as "PUBLISHED" | "DRAFT")}><option value="PUBLISHED">Публикация</option><option value="DRAFT">Черновик</option></select></div></details>
          </label>
        </form>
      ) : null}

      {error ? <p className="workspace-error" role="alert">{error}</p> : null}
      {state === "loading" ? <p className="workspace-empty">Загружаем ленту…</p> : null}
      {state !== "loading" && posts.length === 0 ? (
        <p className="workspace-empty">Публикаций пока нет. Здесь появятся новости курса.</p>
      ) : null}

      <div className="feed-list">
        {posts.map((post) => {
          const commentsOpen = openComments === post.id;
          return (
            <article className="social-post" key={post.id}>
              <header>
                <span className="feed-avatar">ME</span>
                <div>
                  <strong>{post.author.name}</strong>
                  <small>{formatDate(post.publishedAt ?? post.createdAt)}</small>
                </div>
                {post.pinned ? <span className="pinned-label">закреплено</span> : null}
              </header>
              <div className="post-copy"><h2>{post.title}</h2><p>{post.text}</p></div>
              {post.attachments.length ? (
                <div className="post-attachments">
                  {post.attachments.map((attachment) => (
                    <a key={attachment.storageKey} href={attachmentUrl(attachment.url)} download>
                      <span><FileText size={18} /></span>
                      <span>
                        <strong>{attachment.name}</strong>
                        <small>{attachment.mimeType.split("/").at(-1)?.toUpperCase()} · скачать</small>
                      </span>
                      <Download size={17} />
                    </a>
                  ))}
                </div>
              ) : null}
              {post.poll ? <section className="feed-poll"><strong>{post.poll.question}</strong>{post.poll.options.map((option) => { const total = post.poll!.options.reduce((sum, item) => sum + item.votes, 0); const percent = total ? Math.round(option.votes / total * 100) : 0; return <button className={post.poll!.selectedOptionId === option.id ? "selected" : ""} type="button" key={option.id} onClick={() => void vote(post.id, post.poll!.id, option.id)}><span style={{ width: `${percent}%` }} /><em>{option.label}</em><small>{percent}%</small></button>; })}</section> : null}
              <div className="post-actions">
                <button className={post.liked ? "active" : ""} onClick={() => void toggle(post, "like")} type="button">
                  <Heart size={18} fill={post.liked ? "currentColor" : "none"} />{post.counts.likes}
                </button>
                <button className={commentsOpen ? "active" : ""} onClick={() => setOpenComments(commentsOpen ? null : post.id)} type="button">
                  <MessageCircle size={18} />{post.counts.comments}
                </button>
                <button className={post.saved ? "active" : ""} onClick={() => void toggle(post, "bookmark")} type="button" aria-label="Сохранить публикацию">
                  <Bookmark size={18} fill={post.saved ? "currentColor" : "none"} />
                </button>
                <span><Eye size={17} /> {post.counts.views}</span>
              </div>
              {commentsOpen ? (
                <div className="post-comments">
                  {post.comments.map((comment) => (
                    <div key={comment.id}><strong>{comment.author.name}</strong><p>{comment.text}</p></div>
                  ))}
                  <form onSubmit={(event) => void addComment(event, post.id)}>
                    <input
                      value={commentDrafts[post.id] ?? ""}
                      onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                      placeholder="Написать комментарий..."
                      maxLength={2000}
                    />
                    <button type="submit" aria-label="Отправить комментарий"><Send size={17} /></button>
                  </form>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
