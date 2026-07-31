import { AppShell } from "../../components/AppShell";
import { AuthGate } from "../../components/AuthGate";
import { DashboardProgressPanel } from "../../components/DashboardProgressPanel";

export default function DashboardPage() {
  return (
    <AppShell>
      <main className="page-main">
        <div className="container">
          <AuthGate>
            <DashboardProgressPanel />
          </AuthGate>
        </div>
      </main>
    </AppShell>
  );
}
