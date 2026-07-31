import { AppShell } from "../../components/AppShell"; import { AuthGate } from "../../components/AuthGate"; import { CertificatesPanel } from "../../components/CertificatesPanel";
export default function CertificatesPage() { return <AppShell><main className="page-main"><div className="container"><AuthGate><CertificatesPanel /></AuthGate></div></main></AppShell>; }
