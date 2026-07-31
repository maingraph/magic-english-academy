import { AppShell } from "../../components/AppShell";
import { AuthGate } from "../../components/AuthGate";
import { CalendarWorkspace } from "../../components/CalendarWorkspace";
export default function CalendarPage() { return <AppShell><main className="page-main"><div className="container"><AuthGate><CalendarWorkspace /></AuthGate></div></main></AppShell>; }
