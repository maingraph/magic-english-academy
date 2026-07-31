import { ShieldCheck, ShieldX } from "lucide-react";
import { AppShell } from "../../../components/AppShell";

const apiBaseUrl = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const response = await fetch(`${apiBaseUrl}/public/certificates/${encodeURIComponent(token)}`, { cache: "no-store" });
  const certificate = response.ok ? await response.json() as { valid: boolean; holder: string; level: string; score: number; issuedAt: string } : null;
  return <AppShell showBanner={false}><main className="page-main"><div className="container"><section className={`verification-card ${certificate?.valid ? "valid" : "invalid"}`}>{certificate?.valid ? <ShieldCheck size={44} /> : <ShieldX size={44} />}<span>Проверка сертификата</span><h1>{certificate?.valid ? "Сертификат действителен" : "Сертификат не найден"}</h1>{certificate ? <div><p><strong>{certificate.holder}</strong></p><p>Уровень {certificate.level} · {certificate.score}%</p><small>Выдан {new Intl.DateTimeFormat("ru", { dateStyle: "long" }).format(new Date(certificate.issuedAt))}</small></div> : <p>Проверьте ссылку или запросите новую у владельца сертификата.</p>}</section></div></main></AppShell>;
}
