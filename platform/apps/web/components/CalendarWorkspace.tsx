"use client";

import { CalendarPlus, Check, Clock, Users } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
type Event = { id: string; title: string; startsAt: string; type: string; status: string };
type Club = { id: string; title: string; description?: string; startsAt: string; capacity: number; durationMinutes: number; bookings: Array<{ status: string }>; _count?: { bookings: number } };
type Plan = { sessionsPerWeek: number; sessionMinutes: number; preferredDays: string[]; preferredTime: string; reminderEnabled: boolean; autoReschedule: boolean };

export function CalendarWorkspace() {
  const [events, setEvents] = useState<Event[]>([]); const [clubs, setClubs] = useState<Club[]>([]);
  const [plan, setPlan] = useState<Plan>({ sessionsPerWeek: 4, sessionMinutes: 30, preferredDays: ["пн", "ср", "пт"], preferredTime: "19:00", reminderEnabled: true, autoReschedule: false });
  const [title, setTitle] = useState(""); const [startsAt, setStartsAt] = useState(""); const [message, setMessage] = useState("");

  async function load() {
    const [calendarResponse, planResponse] = await Promise.all([fetch(`${apiBaseUrl}/calendar/events`, { credentials: "include" }), fetch(`${apiBaseUrl}/study-plan`, { credentials: "include" })]);
    if (calendarResponse.ok) { const data = await calendarResponse.json() as { events: Event[]; clubs: Club[] }; setEvents(data.events); setClubs(data.clubs); }
    if (planResponse.ok) setPlan(await planResponse.json() as Plan);
  }
  useEffect(() => { void load(); }, []);

  async function savePlan() {
    const response = await fetch(`${apiBaseUrl}/study-plan`, { method: "PATCH", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...plan, reminderMinutes: 30, targetDate: null }) });
    setMessage(response.ok ? "План сохранён." : "План не сохранён.");
  }
  async function addEvent(event: FormEvent) {
    event.preventDefault();
    const response = await fetch(`${apiBaseUrl}/calendar/events`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, startsAt }) });
    if (response.ok) { setTitle(""); setStartsAt(""); await load(); }
  }
  async function book(clubId: string, booked: boolean) {
    await fetch(`${apiBaseUrl}/speaking-clubs/${clubId}/book`, { method: booked ? "DELETE" : "POST", credentials: "include" }); await load();
  }
  function toggleDay(day: string) { setPlan((current) => ({ ...current, preferredDays: current.preferredDays.includes(day) ? current.preferredDays.filter((item) => item !== day) : [...current.preferredDays, day] })); }

  return <div className="experience-page calendar-page"><header className="experience-heading"><div><span>Учебный ритм</span><h1>Календарь</h1><p>Планируй занятия, повторения и speaking clubs в одном месте.</p></div><button type="button" onClick={savePlan}><Check size={18} />Сохранить план</button></header>{message ? <p className="inline-message">{message}</p> : null}
    <section className="calendar-layout"><article className="study-plan-card"><span>Цель недели</span><h2>{plan.sessionsPerWeek} занятия по {plan.sessionMinutes} минут</h2><label>Занятий в неделю<input type="range" min="2" max="7" value={plan.sessionsPerWeek} onChange={(event) => setPlan({ ...plan, sessionsPerWeek: Number(event.target.value) })} /></label><div className="day-picker">{["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map((day) => <button className={plan.preferredDays.includes(day) ? "active" : ""} onClick={() => toggleDay(day)} type="button" key={day}>{day}</button>)}</div><div className="plan-fields"><label>Время<input type="time" value={plan.preferredTime} onChange={(event) => setPlan({ ...plan, preferredTime: event.target.value })} /></label><label>Длительность<select value={plan.sessionMinutes} onChange={(event) => setPlan({ ...plan, sessionMinutes: Number(event.target.value) })}><option>15</option><option>30</option><option>45</option><option>60</option></select></label></div><label className="check-row"><input type="checkbox" checked={plan.autoReschedule} onChange={(event) => setPlan({ ...plan, autoReschedule: event.target.checked })} />Переносить пропущенные занятия</label></article>
      <article className="calendar-events-card"><header><div><span>Ближайшее</span><h2>Расписание</h2></div><CalendarPlus size={20} /></header><form onSubmit={addEvent}><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Личное событие" required /><input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required /><button>Добавить</button></form><div className="event-list">{events.length ? events.slice(0, 10).map((item) => <div key={item.id}><time>{new Intl.DateTimeFormat("ru", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(item.startsAt))}</time><span><strong>{item.title}</strong><small>{item.type.toLowerCase()}</small></span></div>) : <p>Событий пока нет.</p>}</div></article></section>
    <section className="clubs-section"><header><div><span>Практика речи</span><h2>Speaking clubs</h2></div><Users size={21} /></header><div className="club-grid">{clubs.length ? clubs.map((club) => { const booking = club.bookings[0]; return <article key={club.id}><time>{new Intl.DateTimeFormat("ru", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(club.startsAt))}</time><h3>{club.title}</h3><p>{club.description ?? "Живая практика в маленькой группе."}</p><div><span><Clock size={15} />{club.durationMinutes} минут</span><span><Users size={15} />{club._count?.bookings ?? 0}/{club.capacity}</span></div><button type="button" className={booking ? "booked" : ""} onClick={() => void book(club.id, Boolean(booking && booking.status !== "CANCELLED"))}>{booking?.status === "WAITLISTED" ? "В листе ожидания" : booking?.status === "BOOKED" ? "Отменить запись" : "Записаться"}</button></article>; }) : <p>Новые клубы появятся здесь после публикации преподавателем.</p>}</div></section>
  </div>;
}
