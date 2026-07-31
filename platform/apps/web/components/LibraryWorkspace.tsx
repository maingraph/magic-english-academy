"use client";

import { Bookmark, ExternalLink, FileAudio, FileText, Film, Search } from "lucide-react";
import { useEffect, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
type Material = { id: string; type: string; title: string; description?: string; url?: string; tags: string[]; levels: string[]; saved: boolean };
const filters = ["ALL", "GUIDE", "VIDEO", "AUDIO", "FILE", "LINK"];
function MaterialIcon({ type }: { type: string }) { return type === "VIDEO" ? <Film /> : type === "AUDIO" ? <FileAudio /> : <FileText />; }

export function LibraryWorkspace() {
  const [materials, setMaterials] = useState<Material[]>([]); const [query, setQuery] = useState(""); const [type, setType] = useState("ALL"); const [savedOnly, setSavedOnly] = useState(false);
  async function load() { const params = new URLSearchParams(); if (query) params.set("q", query); if (type !== "ALL") params.set("type", type); if (savedOnly) params.set("saved", "true"); const response = await fetch(`${apiBaseUrl}/library?${params}`, { credentials: "include" }); if (response.ok) setMaterials(await response.json() as Material[]); }
  useEffect(() => { const timer = setTimeout(() => void load(), 180); return () => clearTimeout(timer); }, [query, type, savedOnly]);
  async function save(item: Material) { await fetch(`${apiBaseUrl}/library/${item.id}/save`, { method: item.saved ? "DELETE" : "POST", credentials: "include" }); await load(); }
  return <div className="experience-page library-page"><header className="experience-heading"><div><span>Материалы курса</span><h1>Библиотека</h1><p>Гайды, видео, аудио, файлы и коллекции для твоего уровня.</p></div></header><section className="library-toolbar"><label><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти материал" /></label><div>{filters.map((item) => <button className={type === item ? "active" : ""} type="button" onClick={() => setType(item)} key={item}>{item === "ALL" ? "Все" : item.toLowerCase()}</button>)}</div><button className={savedOnly ? "active" : ""} type="button" onClick={() => setSavedOnly((value) => !value)}><Bookmark size={16} />Сохранённые</button></section><section className="material-grid">{materials.length ? materials.map((item) => <article key={item.id}><div className="material-icon"><MaterialIcon type={item.type} /></div><div className="material-tags">{item.levels.map((level) => <span key={level}>{level}</span>)}{item.tags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div><h2>{item.title}</h2><p>{item.description ?? "Дополнительный материал Magic English."}</p><footer><button className={item.saved ? "saved" : ""} type="button" onClick={() => void save(item)}><Bookmark size={17} />{item.saved ? "Сохранено" : "Сохранить"}</button>{item.url ? <a href={item.url} target="_blank" rel="noreferrer">Открыть<ExternalLink size={16} /></a> : null}</footer></article>) : <p className="workspace-empty">Материалов по фильтру пока нет.</p>}</section></div>;
}
