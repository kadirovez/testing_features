const DAY_MS = 86_400_000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function formatClock(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

/** Chat list style: time today, weekday this week, date otherwise. */
export function formatListTime(iso: string, locale: string): string {
  const date = new Date(iso);
  const diffDays = (startOfDay(new Date()) - startOfDay(date)) / DAY_MS;
  if (diffDays === 0) return formatClock(iso, locale);
  if (diffDays < 7) return date.toLocaleDateString(locale, { weekday: "short" });
  return date.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export type DayLabel = { kind: "today" } | { kind: "yesterday" } | { kind: "date"; text: string };

export function dayLabel(iso: string, locale: string): DayLabel {
  const date = new Date(iso);
  const diffDays = (startOfDay(new Date()) - startOfDay(date)) / DAY_MS;
  if (diffDays === 0) return { kind: "today" };
  if (diffDays === 1) return { kind: "yesterday" };
  return { kind: "date", text: date.toLocaleDateString(locale, { day: "numeric", month: "long" }) };
}

export function isSameDay(a: string, b: string): boolean {
  return startOfDay(new Date(a)) === startOfDay(new Date(b));
}

export function formatLastSeen(iso: string, locale: string): string {
  const diffDays = (startOfDay(new Date()) - startOfDay(new Date(iso))) / DAY_MS;
  if (diffDays === 0) return formatClock(iso, locale);
  return `${new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" })} ${formatClock(iso, locale)}`;
}
