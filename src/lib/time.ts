import { TZDate } from "@date-fns/tz";

export const SHOP_TZ = "Europe/Berlin";

/** "YYYY-MM-DD" */
export type LocalDate = string;
/** "HH:MM" (24h) */
export type LocalTime = string;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})(?::\d{2})?$/;

export function isLocalDate(v: string): v is LocalDate {
  const m = DATE_RE.exec(v);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

export function isLocalTime(v: string): v is LocalTime {
  const m = TIME_RE.exec(v);
  return !!m && +m[1] < 24 && +m[2] < 60;
}

export function timeToMinutes(t: string): number {
  const m = TIME_RE.exec(t);
  if (!m) throw new Error(`Invalid time: ${t}`);
  return +m[1] * 60 + +m[2];
}

export function minutesToTime(min: number): LocalTime {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Converts a wall-clock time in the shop's time zone to an absolute instant (DST-aware). */
export function localToUtc(date: LocalDate, time: LocalTime | number, tz = SHOP_TZ): Date {
  const m = DATE_RE.exec(date);
  if (!m) throw new Error(`Invalid date: ${date}`);
  const minutes = typeof time === "number" ? time : timeToMinutes(time);
  const d = new TZDate(+m[1], +m[2] - 1, +m[3], Math.floor(minutes / 60), minutes % 60, 0, 0, tz);
  return new Date(d.getTime());
}

const partsCache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string) {
  let f = partsCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    partsCache.set(tz, f);
  }
  return f;
}

/** Splits an instant into the shop's local date / time. */
export function utcToLocal(instant: Date, tz = SHOP_TZ): { date: LocalDate; time: LocalTime; minutes: number } {
  const p = Object.fromEntries(fmt(tz).formatToParts(instant).map((x) => [x.type, x.value]));
  const time = `${p.hour}:${p.minute}`;
  return { date: `${p.year}-${p.month}-${p.day}`, time, minutes: timeToMinutes(time) };
}

export function todayLocal(now: Date, tz = SHOP_TZ): LocalDate {
  return utcToLocal(now, tz).date;
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const m = DATE_RE.exec(date)!;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + days));
  return d.toISOString().slice(0, 10);
}

/** ISO weekday: 1 = Monday … 7 = Sunday */
export function isoWeekday(date: LocalDate): number {
  const m = DATE_RE.exec(date)!;
  const wd = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay();
  return wd === 0 ? 7 : wd;
}

export function compareDates(a: LocalDate, b: LocalDate) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function formatDateLong(date: LocalDate): string {
  const m = DATE_RE.exec(date)!;
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])));
}

export function formatDateShort(date: LocalDate): string {
  const m = DATE_RE.exec(date)!;
  return new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(
    new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])),
  );
}

export function formatInstant(instant: Date, tz = SHOP_TZ): string {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  }).format(instant);
}

export function monthRange(month: string): { from: LocalDate; to: LocalDate } {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) throw new Error(`Invalid month: ${month}`);
  const first = `${m[1]}-${m[2]}-01`;
  const last = new Date(Date.UTC(+m[1], +m[2], 0)).toISOString().slice(0, 10);
  return { from: first, to: last };
}
