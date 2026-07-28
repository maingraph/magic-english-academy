export function localCalendarDate(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(`${values.year}-${values.month}-${values.day}T00:00:00.000Z`);
}

export function startOfIsoWeek(date: Date) {
  const monday = new Date(date);
  const weekday = (monday.getUTCDay() + 6) % 7;
  monday.setUTCDate(monday.getUTCDate() - weekday);
  return monday;
}

export function activityStats(activeDays: string[], today: Date) {
  const active = new Set(activeDays);
  const monday = startOfIsoWeek(today);
  const weekHasActivity = (weekStart: Date) =>
    Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setUTCDate(weekStart.getUTCDate() + index);
      return active.has(date.toISOString().slice(0, 10));
    }).some(Boolean);
  const weeklyDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    return active.has(date.toISOString().slice(0, 10));
  }).filter(Boolean).length;

  let streakWeeks = 0;
  const cursor = new Date(monday);
  if (!weekHasActivity(cursor)) cursor.setUTCDate(cursor.getUTCDate() - 7);
  while (streakWeeks < 54 && weekHasActivity(cursor)) {
    streakWeeks += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 7);
  }

  return { weeklyDays, streakWeeks };
}
