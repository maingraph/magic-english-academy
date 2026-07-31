import { Suspense } from "react";
import { LoginForm } from "../../components/LoginForm";

export default function LoginPage() {
  const landingUrl = process.env.NEXT_PUBLIC_LANDING_URL ?? "https://magic-english-academy.com";

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-logo">Magic English</div>
        <h1>Вход в аккаунт</h1>
        <Suspense fallback={<p className="auth-note">Загружаем форму входа...</p>}>
          <LoginForm />
        </Suspense>
        <p className="auth-note">
          Если вы купили курс, используйте email и пароль, которые прислал администратор.
          После входа пароль можно сменить в профиле.
        </p>
        <a className="auth-note" href={landingUrl}>
          Вернуться на сайт академии
        </a>
      </section>
    </main>
  );
}
