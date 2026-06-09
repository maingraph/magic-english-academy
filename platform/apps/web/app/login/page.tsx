import { MagicButton } from "../../components/MagicButton";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-logo">Magic English</div>
        <h1>Вход в аккаунт</h1>
        <form className="auth-form">
          <label>
            Логин
            <input name="email" placeholder="Введите ваш логин" type="email" />
          </label>
          <label>
            Пароль
            <input name="password" placeholder="Введите ваш пароль" type="password" />
          </label>
          <MagicButton href="/dashboard" variant="primary">
            Войти
          </MagicButton>
        </form>
        <p className="auth-note">
          Это визуальная основа будущего server-side входа. Старые client-side
          credentials сюда не переносим.
        </p>
      </section>
    </main>
  );
}
