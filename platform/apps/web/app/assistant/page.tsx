import { AppShell } from "../../components/AppShell";
import { AssistantWorkspace } from "../../components/AssistantWorkspace";
import { AuthGate } from "../../components/AuthGate";

export default function AssistantPage() {
  return (
    <AppShell>
      <AuthGate>
        <AssistantWorkspace />
      </AuthGate>
    </AppShell>
  );
}
