"use client";

import { Download, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [updateReady, setUpdateReady] = useState<ServiceWorker | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    let refreshing = false;
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
      setHidden(false);
    };
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        if (registration.waiting) setUpdateReady(registration.waiting);
        registration.addEventListener("updatefound", () => {
          registration.installing?.addEventListener("statechange", () => {
            if (registration.waiting && navigator.serviceWorker.controller) {
              setUpdateReady(registration.waiting);
              setHidden(false);
            }
          });
        });
        void registration.update();
      });

    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  if (hidden || (!installPrompt && !updateReady)) return null;

  return (
    <aside className="pwa-prompt" aria-live="polite">
      <span className="pwa-prompt-icon">
        {updateReady ? <RefreshCw size={20} /> : <Download size={20} />}
      </span>
      <div>
        <strong>{updateReady ? "Доступно обновление" : "Установить Magic English"}</strong>
        <small>
          {updateReady
            ? "Новая версия готова — прогресс сохранится."
            : "Открой платформу как отдельное приложение."}
        </small>
      </div>
      <button
        className="pwa-prompt-action"
        onClick={() =>
          updateReady ? updateReady.postMessage({ type: "SKIP_WAITING" }) : void install()
        }
        type="button"
      >
        {updateReady ? "Обновить" : "Установить"}
      </button>
      <button className="pwa-prompt-close" onClick={() => setHidden(true)} type="button" aria-label="Закрыть">
        <X size={17} />
      </button>
    </aside>
  );
}
