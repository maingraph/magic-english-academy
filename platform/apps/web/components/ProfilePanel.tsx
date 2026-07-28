"use client";

import { FormEvent, useEffect, useState } from "react";
import { Award, BookOpenCheck, Check, Save, Star } from "lucide-react";
import { useSession } from "./SessionProvider";
import { ProfileActivity } from "./ProfileActivity";

type ProfileResponse = {
  email: string;
  role: string;
  createdAt: string;
  profile: {
    displayName: string;
    avatarUrl: string | null;
    locale: string;
    timezone: string;
  };
  course: {
    currentLevel: string;
    completedLessons: number;
    taskPoints: number;
    checkpointCount: number;
  };
  achievements: Array<{
    code: string;
    title: string;
    earnedAt: string;
  }>;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export function ProfilePanel() {
  const { refresh } = useSession();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [timezone, setTimezone] = useState("Europe/Warsaw");
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "saving" | "error">("idle");

  useEffect(() => {
    void loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const response = await fetch(`${apiBaseUrl}/profile`, {
        credentials: "include"
      });

      if (!response.ok) throw new Error("Профиль недоступен");
      const data = (await response.json()) as ProfileResponse;
      setProfile(data);
      setDisplayName(data.profile.displayName);
      setAvatarUrl(data.profile.avatarUrl ?? "");
      setTimezone(data.profile.timezone);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setMessage("Сохраняем изменения...");

    try {
      const response = await fetch(`${apiBaseUrl}/profile`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName, avatarUrl, timezone })
      });

      if (!response.ok) throw new Error("Не удалось сохранить профиль");
      const data = (await response.json()) as ProfileResponse;
      setProfile(data);
      await refresh();
      setStatus("ready");
      setMessage("Профиль сохранён.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить профиль");
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordStatus("saving");
    setPasswordMessage("Обновляем пароль...");

    try {
      const response = await fetch(`${apiBaseUrl}/profile/password`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (!response.ok) throw new Error("Не удалось сменить пароль");
      setCurrentPassword("");
      setNewPassword("");
      setPasswordStatus("idle");
      setPasswordMessage("Пароль обновлён.");
    } catch (error) {
      setPasswordStatus("error");
      setPasswordMessage(error instanceof Error ? error.message : "Не удалось сменить пароль");
    }
  }

  if (status === "loading") {
    return <div className="workspace-state">Загружаем профиль...</div>;
  }

  if (!profile) {
    return <div className="workspace-state error">Профиль недоступен.</div>;
  }

  const totalPoints = profile.course.taskPoints;

  return (
    <div className="profile-layout">
      <section className="workspace-panel profile-summary">
        <div className="profile-photo">
          {profile.profile.avatarUrl ? (
            <img src={profile.profile.avatarUrl} alt="" />
          ) : (
            profile.profile.displayName.slice(0, 1).toUpperCase()
          )}
        </div>
        <div>
          <h2>{profile.profile.displayName}</h2>
          <p>{profile.email}</p>
          <span className="role-badge">
            {profile.role === "admin" ? "Администратор" : profile.role === "owner" ? "Владелец" : "Ученик"}
          </span>
        </div>
      </section>

      <section className="workspace-metrics four">
        <article>
          <BookOpenCheck size={20} />
          <strong>{profile.course.currentLevel}</strong>
          <span>Текущий уровень</span>
        </article>
        <article>
          <Check size={20} />
          <strong>{profile.course.completedLessons}</strong>
          <span>Уроков завершено</span>
        </article>
        <article>
          <Star size={20} />
          <strong>{totalPoints}</strong>
          <span>Всего баллов</span>
        </article>
        <article>
          <Award size={20} />
          <strong>{profile.course.checkpointCount}</strong>
          <span>Проверочные задания</span>
        </article>
      </section>

      <ProfileActivity />

      <form className="workspace-panel profile-form" onSubmit={saveProfile}>
        <div className="panel-heading">
          <div>
            <span>Аккаунт</span>
            <h2>Настройки профиля</h2>
          </div>
          <button disabled={status === "saving"} type="submit">
            <Save size={17} />
            {status === "saving" ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
        <div className="form-grid">
          <label>
            Отображаемое имя
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={120}
              required
            />
          </label>
          <label>
            Электронная почта
            <input value={profile.email} disabled />
          </label>
          <label className="span-two">
            Ссылка на изображение профиля
            <input
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="https://..."
              type="url"
            />
          </label>
          <label>
            Часовой пояс
            <input
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
            />
          </label>
          <label>
            Язык
            <select defaultValue={profile.profile.locale}>
              <option value="ru">Русский</option>
              <option value="en">Английский</option>
            </select>
          </label>
        </div>
        {message ? <p className={`form-message ${status}`}>{message}</p> : null}
      </form>

      <form className="workspace-panel profile-form" onSubmit={changePassword}>
        <div className="panel-heading">
          <div>
            <span>Безопасность</span>
            <h2>Смена пароля</h2>
          </div>
          <button disabled={passwordStatus === "saving"} type="submit">
            <Save size={17} />
            {passwordStatus === "saving" ? "Сохраняем..." : "Сменить пароль"}
          </button>
        </div>
        <div className="form-grid">
          <label>
            Текущий пароль
            <input
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              minLength={8}
              required
              type="password"
            />
          </label>
          <label>
            Новый пароль
            <input
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              required
              type="password"
            />
          </label>
        </div>
        {passwordMessage ? (
          <p className={`form-message ${passwordStatus}`}>{passwordMessage}</p>
        ) : null}
      </form>
    </div>
  );
}
