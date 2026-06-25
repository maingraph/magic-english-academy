"use client";

import { Bot, CheckCircle2, Lightbulb, ListChecks, Sparkles, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ActionId = "explain" | "examples" | "quiz" | "check";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const actions: Array<{
  id: ActionId;
  label: string;
  description: string;
  icon: typeof Bot;
}> = [
  {
    id: "explain",
    label: "Объяснить фразу",
    description: "Значение, грамматика и пример",
    icon: Lightbulb
  },
  {
    id: "examples",
    label: "Больше примеров",
    description: "Четыре примера с переводом",
    icon: Sparkles
  },
  {
    id: "quiz",
    label: "Мини-тест",
    description: "Один вопрос по текущему уроку",
    icon: ListChecks
  },
  {
    id: "check",
    label: "Проверить ответ",
    description: "Исправления и краткий разбор",
    icon: CheckCircle2
  }
];

export function AssistantDrawer({
  open,
  onOpen,
  onClose
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const lessonSlug = useMemo(() => {
    const match = pathname.match(/\/lessons\/([^/]+)/);
    return match?.[1] ?? null;
  }, [pathname]);
  const [text, setText] = useState("");
  const [selectedAction, setSelectedAction] = useState<ActionId>("explain");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [quota, setQuota] = useState<{ remaining: number; configured: boolean } | null>(
    null
  );

  useEffect(() => {
    function receiveSelection(event: Event) {
      const detail = (event as CustomEvent<{ text?: string }>).detail;
      setText(detail.text ?? "");
      setSelectedAction("explain");
      setOutput("");
      onOpen();
    }

    window.addEventListener("magic-assistant:explain", receiveSelection);
    return () => window.removeEventListener("magic-assistant:explain", receiveSelection);
  }, [onOpen]);

  useEffect(() => {
    if (!open) return;
    const params = lessonSlug ? `?lessonSlug=${encodeURIComponent(lessonSlug)}` : "";
    fetch(`${apiBaseUrl}/assistant/status${params}`, { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) {
          setQuota({ remaining: data.remaining, configured: data.configured });
        }
      })
      .catch(() => setQuota(null));
  }, [lessonSlug, open]);

  async function run() {
    setStatus("loading");
    setOutput("");
    const response = await fetch(`${apiBaseUrl}/assistant/run`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: selectedAction,
        text,
        lessonSlug
      })
    });

    if (response.ok) {
      const data = (await response.json()) as {
        output: string;
        usage: { remaining: number };
      };
      setOutput(data.output);
      setQuota((current) =>
        current ? { ...current, remaining: data.usage.remaining } : current
      );
      setStatus("idle");
    } else {
      const error = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      setOutput(error?.message ?? "Ассистент временно недоступен.");
      setStatus("error");
    }
  }

  return (
    <>
      <div className={`assistant-overlay ${open ? "open" : ""}`} onClick={onClose} />
      <aside className={`assistant-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <header>
          <div>
            <Bot size={22} />
            <span>
              <strong>Ассистент курса</strong>
              <small>{lessonSlug ? "Учитывает текущий урок" : "Помощь по платформе"}</small>
            </span>
          </div>
          <button onClick={onClose} type="button" aria-label="Закрыть ассистента">
            <X size={20} />
          </button>
        </header>

        <div className="assistant-body">
          <div className="assistant-quota">
            <span>{quota?.configured ? "AI готов" : "Нужен API-ключ"}</span>
            <strong>{quota ? `Осталось действий: ${quota.remaining}` : "Загружаем лимит..."}</strong>
          </div>

          <div className="assistant-actions">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  className={selectedAction === action.id ? "active" : ""}
                  key={action.id}
                  onClick={() => setSelectedAction(action.id)}
                  type="button"
                >
                  <Icon size={18} />
                  <span>
                    <strong>{action.label}</strong>
                    <small>{action.description}</small>
                  </span>
                </button>
              );
            })}
          </div>

          <label className="assistant-input">
            Выделенная фраза или ваш ответ
            <textarea
              rows={5}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={
                selectedAction === "quiz"
                  ? "Необязательно: укажите тему теста"
                  : "Выделите текст в уроке или введите короткую фразу"
              }
            />
          </label>
          <button
            className="assistant-run"
            disabled={status === "loading" || quota?.configured === false}
            onClick={run}
            type="button"
          >
            <Sparkles size={17} />
            {status === "loading" ? "Обрабатываем..." : "Запустить"}
          </button>

          {output ? (
            <div className={`assistant-output ${status === "error" ? "error" : ""}`}>
              {output}
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
