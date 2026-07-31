import { AppShell } from "../../components/AppShell";
import { AuthGate } from "../../components/AuthGate";
import { TrainingWorkspace } from "../../components/TrainingWorkspace";

export default function TrainingPage() { return <AppShell><main className="page-main"><div className="container"><AuthGate><TrainingWorkspace /></AuthGate></div></main></AppShell>; }
