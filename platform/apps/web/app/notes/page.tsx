import { AppShell } from "../../components/AppShell";
import { AuthGate } from "../../components/AuthGate";
import { NotesWorkspace } from "../../components/NotesWorkspace";

export default function NotesPage() {
  return (
    <AppShell>
      <AuthGate>
        <NotesWorkspace />
      </AuthGate>
    </AppShell>
  );
}
