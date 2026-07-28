"use client";

import {
  ArrowUp,
  Bot,
  CheckCircle2,
  FilePlus2,
  Lightbulb,
  ListChecks,
  Sparkles
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

type ActionId = "explain" | "examples" | "quiz" | "check";
type Message = { id: string; role: "assistant" | "user"; content: string };
type AssistantContext = {
  mode: "lesson" | "general";
  lessonSlug: string | null;
  title: string;
  summary: string | null;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const suggestions: Array<{ id: ActionId; label: string; icon: typeof Bot }> = [
  { id: "explain", label: "Объясни проще", icon: Lightbulb },
  { id: "examples", label: "Дай примеры", icon: Sparkles },
  { id: "quiz", label: "Создай мини-тест", icon: ListChecks },
  { id: "check", label: "Проверь мой ответ", icon: CheckCircle2 }
];

export function AssistantWorkspace() {
  const [action, setAction] = useState<ActionId>("explain");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [configured, setConfigured] = useState(true);
  const [context, setContext] = useState<AssistantContext>({
    mode: "general",
    lessonSlug: null,
    title: "Общая практика",
    summary: null
  });
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${apiBaseUrl}/assistant/status`, { credentials: "include" }),
      fetch(`${apiBaseUrl}/assistant/history`, { credentials: "include" })
    ])
      .then(async ([statusResponse, historyResponse]) => {
        const statusData = statusResponse.ok
          ? ((await statusResponse.json()) as {
              remaining: number;
              configured: boolean;
              context: AssistantContext;
            })
          : null;
        const historyData = historyResponse.ok
          ? ((await historyResponse.json()) as {
              context: AssistantContext;
              messages: Array<{
                id: string;
                role: "assistant" | "user";
                content: string;
              }>;
            })
          : null;
        setRemaining(statusData?.remaining ?? null);
        setConfigured(statusData?.configured ?? false);
        setContext(
          historyData?.context ??
            statusData?.context ?? {
              mode: "general",
              lessonSlug: null,
              title: "Общая практика",
              summary: null
            }
        );
        setMessages(
          historyData?.messages.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content
          })) ?? []
        );
        setStatus("idle");
      })
      .catch(() => setStatus("error"));
  }, []);

  async function send(event: FormEvent) {
    event.preventDefault();
    const prompt = text.trim();
    if (!prompt || status === "loading") return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt
    };
    setMessages((current) => [...current, userMessage]);
    setText("");
    setStatus("loading");

    try {
      const response = await fetch(`${apiBaseUrl}/assistant/run`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          text: prompt,
          lessonSlug: context.lessonSlug
        })
      });
      const data = (await response.json().catch(() => null)) as {
        output?: string;
        message?: string;
        usage?: { remaining: number };
        context?: AssistantContext;
      } | null;

      if (!response.ok) throw new Error(data?.message ?? "Ассистент временно недоступен.");
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data?.output ?? "Ответ не получен."
        }
      ]);
      setRemaining(data?.usage?.remaining ?? remaining);
      if (data?.context) setContext(data.context);
      setStatus("idle");
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: error instanceof Error ? error.message : "Ассистент временно недоступен."
        }
      ]);
      setStatus("error");
    }
  }

  async function attachTextFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setText((current) =>
      [current, `Файл ${file.name}:\n${content.slice(0, 2500)}`].filter(Boolean).join("\n\n")
    );
    event.target.value = "";
  }

  return (
    <div className="ai-workspace">
      <header className="ai-workspace-header">
        <span className="ai-orb"><Sparkles size={22} /></span>
        <div>
          <strong>Magic AI</strong>
          <small>
            Контекст: {context.mode === "lesson" ? `последний урок · ${context.title}` : context.title}
          </small>
        </div>
        <span className={`ai-status ${configured ? "ready" : ""}`}>
          {configured
            ? remaining === null
              ? "готов"
              : `${remaining} запросов`
            : "нужна настройка"}
        </span>
      </header>

      <div className="ai-chat">
        {messages.length === 0 ? (
          <div className="ai-welcome">
            <span className="ai-orb large"><Sparkles size={30} /></span>
            <h1>Что разберём сегодня?</h1>
            <p>Спроси про правило, попроси примеры или принеси свой ответ на проверку.</p>
            <div className="ai-suggestions">
              {suggestions.map((suggestion) => {
                const Icon = suggestion.icon;
                return (
                  <button
                    className={action === suggestion.id ? "active" : ""}
                    key={suggestion.id}
                    onClick={() => {
                      setAction(suggestion.id);
                      setText(suggestion.label);
                    }}
                    type="button"
                  >
                    <Icon size={18} />
                    {suggestion.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="ai-messages" aria-live="polite">
            {messages.map((message) => (
              <div className={`ai-message ${message.role}`} key={message.id}>
                {message.role === "assistant" ? (
                  <span className="ai-orb"><Sparkles size={17} /></span>
                ) : null}
                <div>{message.content}</div>
              </div>
            ))}
            {status === "loading" ? (
              <div className="ai-message assistant">
                <span className="ai-orb"><Sparkles size={17} /></span>
                <div className="ai-typing"><i /><i /><i /></div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="ai-composer-wrap">
        <div className="ai-action-tabs">
          {suggestions.map((suggestion) => (
            <button
              className={action === suggestion.id ? "active" : ""}
              key={suggestion.id}
              onClick={() => setAction(suggestion.id)}
              type="button"
            >
              {suggestion.label}
            </button>
          ))}
        </div>
        <form className="ai-composer" onSubmit={send}>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Спроси Magic AI..."
            rows={2}
          />
          <div>
            <button
              className="ai-attach"
              onClick={() => fileInput.current?.click()}
              type="button"
              title="Прикрепить текстовый файл"
            >
              <FilePlus2 size={19} />
            </button>
            <input
              ref={fileInput}
              onChange={attachTextFile}
              type="file"
              accept=".txt,.md,.csv,text/plain,text/markdown,text/csv"
              hidden
            />
            <span>Ответы помогают учиться, но не заменяют преподавателя</span>
            <button
              className="ai-send"
              disabled={!text.trim() || status === "loading" || !configured}
              type="submit"
              aria-label="Отправить"
            >
              <ArrowUp size={19} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
