import { AppShell } from "../../components/AppShell"; import { AuthGate } from "../../components/AuthGate"; import { LibraryWorkspace } from "../../components/LibraryWorkspace";
export default function LibraryPage() { return <AppShell><main className="page-main"><div className="container"><AuthGate><LibraryWorkspace /></AuthGate></div></main></AppShell>; }
