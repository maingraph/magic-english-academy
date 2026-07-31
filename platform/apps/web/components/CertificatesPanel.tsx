"use client";

import { Award, Download, LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
type Level = {
  id: string;
  code: string;
  title: string;
  certificate: null | {
    id: string;
    score: number;
    issuedAt: string;
    verificationToken: string;
  };
};

export function CertificatesPanel() {
  const [levels, setLevels] = useState<Level[]>([]);
  useEffect(() => {
    fetch(`${apiBaseUrl}/certificates`, { credentials: "include" })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setLevels(data as Level[]));
  }, []);

  return (
    <div className="experience-page certificates-page">
      <header className="experience-heading"><div><span>A0–C1</span><h1>Сертификаты</h1><p>Сертификат открывается после 100% итоговой проверки уровня.</p></div></header>
      <section className="certificate-grid">
        {levels.map((level) => (
          <article className={level.certificate ? "issued" : "locked"} key={level.id}>
            <div className="certificate-mark">{level.certificate ? <Award size={30} /> : <LockKeyhole size={26} />}</div>
            <span>Magic English · {level.code}</span><h2>{level.title}</h2>
            {level.certificate ? <><p>Результат: {level.certificate.score}%</p><small>Выдан {new Intl.DateTimeFormat("ru", { dateStyle: "long" }).format(new Date(level.certificate.issuedAt))}</small><footer><a href={`/verify/${level.certificate.verificationToken}`} target="_blank" rel="noreferrer"><ShieldCheck size={16} />Проверить</a><a href={`${apiBaseUrl}/certificates/${level.certificate.id}/download`}><Download size={16} />Скачать</a></footer></> : <p>Заверши все уроки и итоговую проверку на 100%.</p>}
          </article>
        ))}
      </section>
    </div>
  );
}
