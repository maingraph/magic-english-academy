import { Suspense } from "react";
import { LoginForm } from "../../components/LoginForm";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-logo">Magic English</div>
        <h1>Вход в аккаунт</h1>
        <Suspense fallback={<p className="auth-note">Загружаем форму входа...</p>}>
          <LoginForm />
        </Suspense>
        <p className="auth-note">
          Доступ к кабинету и админке теперь идет через защищенную cookie-сессию.
        </p>
      </section>
    </main>
  );
}
