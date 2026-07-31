import { AppShell } from "../../../components/AppShell"; import { AuthGate } from "../../../components/AuthGate"; import { FeedWorkspace } from "../../../components/FeedWorkspace";
export default function Page() { return <AppShell><AuthGate role="admin"><FeedWorkspace /></AuthGate></AppShell>; }
