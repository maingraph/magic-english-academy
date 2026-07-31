"use client";

import { Check, Dices, Flame, Languages, Puzzle, RotateCcw, Sparkles, SpellCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const modes = [
  ["CHOICE", "Выбери перевод", Languages],
  ["LETTERS", "Собери слово", SpellCheck],
  ["MATCHING", "Найди пару", Puzzle],
  ["CONTEXT", "Вставь в контекст", Sparkles],
  ["IRREGULAR_VERBS", "Неправильные глаголы", RotateCcw],
  ["PERSONAL_SET", "Личный набор", Dices]
] as const;

type Card = { termId: string; term: string; translation: string | null; prompt: string; letters?: string[] };
type Session = { id: string; total: number; correct: number; xpEarned: number };

export function TrainingWorkspace() {
  const [due, setDue] = useState(0);
  const [mode, setMode] = useState("CHOICE");
  const [session, setSession] = useState<Session | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{ correct: boolean; dueAt: string } | null>(null);
  const [status, setStatus] = useState("Выбери режим и начни короткую тренировку.");

  useEffect(() => {
    fetch(`${apiBaseUrl}/training/due?limit=100`, { credentials: "include" })
      .then((response) => response.ok ? response.json() : [])
      .then((items: unknown[]) => setDue(items.length));
  }, []);

  async function start(selected = mode) {
    setMode(selected);
    const response = await fetch(`${apiBaseUrl}/training/sessions`, {
      method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: selected, limit: 12 })
    });
    if (!response.ok) return setStatus("Не удалось начать тренировку.");
    const data = await response.json() as { session: Session; cards: Card[] };
    setSession(data.session); setCards(data.cards); setIndex(0); setAnswer(""); setFeedback(null);
    setStatus(data.cards.length ? "Отвечай честно — интервал следующего повторения изменится." : "Нет слов для повторения. Добавь их в словаре.");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const card = cards[index];
    if (!session || !card || !answer.trim()) return;
    const response = await fetch(`${apiBaseUrl}/training/sessions/${session.id}/answers`, {
      method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ termId: card.termId, answer, rating: 3 })
    });
    if (!response.ok) return setStatus("Ответ не сохранён.");
    const data = await response.json() as { answer: { isCorrect: boolean }; session: Session; dueAt: string };
    setSession(data.session); setFeedback({ correct: data.answer.isCorrect, dueAt: data.dueAt });
  }

  async function next() {
    if (index + 1 >= cards.length && session) {
      const response = await fetch(`${apiBaseUrl}/training/sessions/${session.id}/complete`, { method: "POST", credentials: "include" });
      if (response.ok) setSession(await response.json() as Session);
      setCards([]); setStatus("Раунд завершён. Результат сохранён.");
      return;
    }
    setIndex((value) => value + 1); setAnswer(""); setFeedback(null);
  }

  const card = cards[index];
  return <div className="experience-page training-page">
    <header className="experience-heading"><div><span>Умное повторение FSRS</span><h1>Тренировки</h1><p>{status}</p></div><div className="due-badge"><Flame size={18} /><strong>{due}</strong><span>карточек сегодня</span></div></header>
    {!card ? <div className="training-mode-grid">{modes.map(([id, title, Icon]) => <button className={mode === id ? "active" : ""} type="button" key={id} onClick={() => void start(id)}><Icon size={23} /><strong>{title}</strong><span>12 карточек · 5–8 минут</span></button>)}</div> :
      <section className="training-session-card"><header><span>{modes.find(([id]) => id === mode)?.[1]}</span><strong>{index + 1}/{cards.length}</strong></header><div className="training-progress"><span style={{ width: `${((index + 1) / cards.length) * 100}%` }} /></div><div className="training-prompt"><small>Переведи или введи пару</small><h2>{card.prompt}</h2>{card.letters ? <div className="letter-chips">{card.letters.map((letter, letterIndex) => <span key={`${letter}-${letterIndex}`}>{letter}</span>)}</div> : null}</div><form onSubmit={submit}><input autoFocus value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Твой ответ" disabled={Boolean(feedback)} />{feedback ? <button type="button" onClick={next}>Следующая карточка</button> : <button type="submit">Проверить</button>}</form>{feedback ? <div className={`training-feedback ${feedback.correct ? "correct" : "wrong"}`}><Check size={19} /><span><strong>{feedback.correct ? "Верно" : `Ответ: ${card.translation ?? card.term}`}</strong><small>Следующее повторение: {new Intl.DateTimeFormat("ru", { dateStyle: "medium" }).format(new Date(feedback.dueAt))}</small></span></div> : null}</section>}
    {session ? <section className="training-stats"><span><strong>{session.correct}</strong> верно</span><span><strong>{session.xpEarned}</strong> XP</span><span><strong>{session.total}</strong> в раунде</span></section> : null}
  </div>;
}
