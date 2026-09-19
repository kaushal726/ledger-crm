const LOCALE = "en-IN";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function parseISODate(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  return { from: toISODate(new Date(y, m - 1, 1)), to: toISODate(new Date(y, m, 0)) };
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  return iso ? parseISODate(iso).toLocaleDateString(LOCALE, opts) : "";
}

export function formatDayLabel(iso: string): string {
  const today = todayISO();
  if (iso === today) return "Today";
  if (iso === addDays(today, -1)) return "Yesterday";
  if (iso === addDays(today, 1)) return "Tomorrow";
  return formatDate(iso, { weekday: "short", day: "numeric", month: "short" });
}

export function formatMonth(month: string): string {
  return parseISODate(month + "-01").toLocaleDateString(LOCALE, { month: "long", year: "numeric" });
}

export function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(LOCALE, { hour: "numeric", minute: "2-digit" });
}

export function formatRange(range: { from: string; to: string }): string {
  if (!range.from && !range.to) return "All time";
  if (range.from === range.to) return formatDate(range.from);
  if (!range.to) return `From ${formatDate(range.from)}`;
  if (!range.from) return `Up to ${formatDate(range.to)}`;
  return `${formatDate(range.from)} – ${formatDate(range.to)}`;
}

export function rangeSlug(range: { from: string; to: string }): string {
  if (!range.from && !range.to) return "all-time";
  if (range.from === range.to) return range.from;
  return `${range.from || "start"}-to-${range.to || todayISO()}`;
}

export function isWithin(iso: string, from: string, to: string): boolean {
  return (!from || iso >= from) && (!to || iso <= to);
}
