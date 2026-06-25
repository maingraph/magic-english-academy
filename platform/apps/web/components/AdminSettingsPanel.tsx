"use client";

import { KeyRound, Save, TestTube2, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type Settings = {
  assistant: {
    provider: string;
    model: string;
    dailyQuota: number;
    apiKeyConfigured: boolean;
    apiKeySource: "database" | "environment";
  };
  email: {
    provider: string;
    configured: boolean;
    from: string;
  };
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export function AdminSettingsPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [provider, setProvider] = useState("openrouter");
  const [model, setModel] = useState("openai/gpt-4.1-mini");
  const [dailyQuota, setDailyQuota] = useState(20);
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch(`${apiBaseUrl}/admin/settings`, { credentials: "include" })
      .then((response) => response.json() as Promise<Settings>)
      .then((data) => {
        setSettings(data);
        setProvider(data.assistant.provider);
        setModel(data.assistant.model);
        setDailyQuota(data.assistant.dailyQuota);
      })
      .catch(() => setMessage("Настройки недоступны."));
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setMessage("Сохраняем...");
    const response = await fetch(`${apiBaseUrl}/admin/settings/assistant`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider, model, dailyQuota, apiKey })
    });

    if (response.ok) {
      const data = (await response.json()) as Settings;
      setSettings(data);
      setApiKey("");
      setMessage("Настройки ассистента сохранены. Новый ключ хранится в зашифрованном виде.");
    } else {
      setMessage("Не удалось сохранить настройки.");
    }
  }

  async function testConnection() {
    setTesting(true);
    setMessage("Проверяем подключение...");

    try {
      const response = await fetch(`${apiBaseUrl}/admin/settings/assistant/test`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, model, apiKey })
      });
      const data = (await response.json().catch(() => null)) as {
        message?: string;
        latencyMs?: number;
      } | null;

      setMessage(
        response.ok
          ? `Подключение работает (${data?.latencyMs ?? 0} мс).`
          : data?.message ?? "Проверка подключения завершилась ошибкой."
      );
    } finally {
      setTesting(false);
    }
  }

  async function clearKey() {
    const response = await fetch(`${apiBaseUrl}/admin/settings/assistant`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider, model, dailyQuota, clearApiKey: true })
    });

    if (response.ok) {
      const data = (await response.json()) as Settings;
      setSettings(data);
      setApiKey("");
      setMessage(
        data.assistant.apiKeyConfigured
          ? "Ключ из базы удалён. Используется ключ из окружения."
          : "API-ключ удалён."
      );
    } else {
      setMessage("Не удалось удалить ключ.");
    }
  }

  return (
    <div className="settings-grid">
      <form className="workspace-panel" onSubmit={save}>
        <div className="panel-heading">
          <div>
            <span>Ассистент с ограничениями</span>
            <h2>ИИ-провайдер</h2>
          </div>
          <KeyRound size={22} />
        </div>
        <div className="form-grid">
          <label>
            Провайдер
            <select value={provider} onChange={(event) => setProvider(event.target.value)}>
              <option value="openrouter">OpenRouter</option>
              <option value="openai">OpenAI</option>
            </select>
          </label>
          <label>
            Модель
            <input value={model} onChange={(event) => setModel(event.target.value)} />
          </label>
          <label>
            Действий в день на ученика
            <input
              min={1}
              max={500}
              type="number"
              value={dailyQuota}
              onChange={(event) => setDailyQuota(Number(event.target.value))}
            />
          </label>
          <label>
            API-ключ
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={
                settings?.assistant.apiKeyConfigured
                  ? "Ключ настроен — введите новый для замены"
                  : "Введите API-ключ"
              }
              autoComplete="off"
            />
          </label>
        </div>
        <div className="settings-actions">
          <button className="settings-save" type="submit">
            <Save size={17} />
            Сохранить настройки
          </button>
          <button disabled={testing} onClick={testConnection} type="button">
            <TestTube2 size={17} />
            {testing ? "Проверяем..." : "Проверить подключение"}
          </button>
          {settings?.assistant.apiKeySource === "database" ? (
            <button onClick={clearKey} type="button">
              <Trash2 size={17} />
              Удалить сохранённый ключ
            </button>
          ) : null}
        </div>
        {message ? <p className="form-message">{message}</p> : null}
      </form>

      <section className="workspace-panel">
        <div className="panel-heading">
          <div>
            <span>Отправка достижений</span>
            <h2>Почтовый провайдер</h2>
          </div>
        </div>
        <dl className="settings-status">
          <div>
            <dt>Провайдер</dt>
            <dd>{settings?.email.provider ?? "Resend"}</dd>
          </div>
          <div>
            <dt>Статус</dt>
            <dd>{settings?.email.configured ? "Настроен" : "Нужен ключ в окружении"}</dd>
          </div>
          <div>
            <dt>Отправитель</dt>
            <dd>{settings?.email.from ?? "Не настроено"}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
