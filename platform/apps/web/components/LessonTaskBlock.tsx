"use client";

import { useState } from "react";

type LessonTaskBlockProps = {
  lessonSlug: string;
  blockOrder: number;
  title: string;
  prompt: string;
  options: string[];
  answer: string;
  checkpoint?: boolean;
};

export function LessonTaskBlock({
  title,
  prompt,
  options,
  answer,
  lessonSlug,
  blockOrder,
  checkpoint = false
}: LessonTaskBlockProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [result, setResult] = useState<{
    correct: boolean;
    pointsEarned: number;
    feedback: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const isCorrect = result?.correct ?? selectedOption === answer;

  async function selectOption(option: string) {
    setSelectedOption(option);
    setResult(null);
    setSaving(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}/learning/lessons/${lessonSlug}/answer`,
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            blockOrder,
            answer: option
          })
        }
      );

      if (response.ok) {
        setResult(
          (await response.json()) as {
            correct: boolean;
            pointsEarned: number;
            feedback: string;
          }
        );
      } else {
        setResult({
          correct: option === answer,
          pointsEarned: 0,
          feedback:
            response.status === 401
              ? "Войдите, чтобы сохранять баллы и попытки."
              : "Ответ проверен локально, но сохранить результат не удалось."
        });
      }
    } catch {
      setResult({
        correct: option === answer,
        pointsEarned: 0,
        feedback: "Ответ проверен локально, но сохранить результат не удалось."
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={`lesson-block task-block ${checkpoint ? "checkpoint-task" : ""}`}>
      <span className="admin-kicker">
        {checkpoint ? "Задание для проверки" : "Практика"}
      </span>
      <h2>{title || "Задание"}</h2>
      <p>{prompt}</p>
      <div className="lesson-options" role="group" aria-label={prompt}>
        {options.map((option) => {
          const isSelected = option === selectedOption;
          const optionState = isSelected
            ? isCorrect
              ? "correct"
              : "incorrect"
            : "";

          return (
            <button
              aria-pressed={isSelected}
              className={`lesson-option ${optionState}`}
              disabled={saving}
              key={option}
              onClick={() => selectOption(option)}
              type="button"
            >
              {option}
            </button>
          );
        })}
      </div>
      {selectedOption && result ? (
        <div
          aria-live="polite"
          className={`lesson-task-feedback ${isCorrect ? "correct" : "incorrect"}`}
          role="status"
        >
          <strong>{isCorrect ? "Верно!" : "Попробуйте ещё раз."}</strong>
          <span>{result.feedback}</span>
        </div>
      ) : null}
    </section>
  );
}
