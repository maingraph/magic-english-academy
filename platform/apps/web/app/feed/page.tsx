import { AppShell } from "../../components/AppShell";
import { AuthGate } from "../../components/AuthGate";
import { FeedWorkspace } from "../../components/FeedWorkspace";

export default function FeedPage() {
  return (
    <AppShell>
      <AuthGate>
        <FeedWorkspace />
      </AuthGate>
    </AppShell>
  );
}
