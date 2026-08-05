import { AppShell } from "../../../components/AppShell";
import { AdminPaymentsPanel } from "../../../components/AdminPaymentsPanel";
import { AuthGate } from "../../../components/AuthGate";

export default function AdminPaymentsPage() {
  return (
    <AppShell showBanner={false}>
      <main className="page-main">
        <div className="container">
          <section className="section-copy">
            <h1>ПЛАТЕЖИ</h1>
            <p>Статусы Альфа-Банка, оплаченные заказы и ручная выдача доступа.</p>
          </section>
          <AuthGate role="admin"><AdminPaymentsPanel /></AuthGate>
        </div>
      </main>
    </AppShell>
  );
}
