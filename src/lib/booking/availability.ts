/**
 * Pure availability engine — no I/O. Given the schedule configuration and the
 * existing bookings, it returns the slots that can genuinely be booked.
 * The same function is used to render choices AND to re-validate a booking on
 * the server right before it is written; the database exclusion constraint is
 * the final guard against races.
 */
import {
  type LocalDate,
  addDays,
  compareDates,
  isoWeekday,
  localToUtc,
  minutesToTime,
  timeToMinutes,
  todayLocal,
} from "@/lib/time";

export type AvailabilityRule = {
  barberId: string | null;
  weekday: number; // ISO 1..7
  start: string; // HH:MM
  end: string;
  validFrom: LocalDate | null;
  validUntil: LocalDate | null;
};

export type AvailabilityException = {
  barberId: string | null;
  date: LocalDate;
  start: string | null;
  end: string | null;
  kind: "closed" | "break" | "extra_open";
};

export type BusyInterval = { barberId: string; start: Date; end: Date };

export type SchedulingSettings = {
  bookingEnabled: boolean;
  bookingStartDate: LocalDate;
  slotIntervalMinutes: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  timezone: string;
};

export type SchedulingContext = {
  settings: SchedulingSettings;
  barberIds: string[];
  rules: AvailabilityRule[];
  exceptions: AvailabilityException[];
  busy: BusyInterval[];
};

export type Slot = {
  time: string; // local HH:MM
  startsAt: Date;
  endsAt: Date;
  barberIds: string[]; // barbers free for this slot, in preference order
};

type Interval = [number, number]; // minutes since local midnight, [start, end)

function mergeIntervals(list: Interval[]): Interval[] {
  const sorted = [...list].sort((a, b) => a[0] - b[0]);
  const out: Interval[] = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

function subtract(open: Interval[], cut: Interval): Interval[] {
  const out: Interval[] = [];
  for (const [s, e] of open) {
    if (cut[1] <= s || cut[0] >= e) {
      out.push([s, e]);
      continue;
    }
    if (cut[0] > s) out.push([s, cut[0]]);
    if (cut[1] < e) out.push([cut[1], e]);
  }
  return out;
}

const applies = (ruleBarber: string | null, barberId: string) => ruleBarber === null || ruleBarber === barberId;

/** Opening intervals for one barber on one local date, after closures and breaks. */
export function openIntervalsFor(ctx: SchedulingContext, barberId: string, date: LocalDate): Interval[] {
  const weekday = isoWeekday(date);
  const exceptions = ctx.exceptions.filter((x) => x.date === date && applies(x.barberId, barberId));
  if (exceptions.some((x) => x.kind === "closed" && x.start === null)) return [];

  let open: Interval[] = ctx.rules
    .filter(
      (r) =>
        r.weekday === weekday &&
        applies(r.barberId, barberId) &&
        (!r.validFrom || compareDates(date, r.validFrom) >= 0) &&
        (!r.validUntil || compareDates(date, r.validUntil) <= 0),
    )
    .map((r) => [timeToMinutes(r.start), timeToMinutes(r.end)] as Interval);

  for (const x of exceptions) {
    if (x.kind === "extra_open" && x.start && x.end) open.push([timeToMinutes(x.start), timeToMinutes(x.end)]);
  }
  open = mergeIntervals(open);
  for (const x of exceptions) {
    if ((x.kind === "break" || x.kind === "closed") && x.start && x.end) {
      open = subtract(open, [timeToMinutes(x.start), timeToMinutes(x.end)]);
    }
  }
  return open.filter(([s, e]) => e > s);
}

/** Whether a local date is inside the bookable window (ignoring opening hours). */
export function isDateInWindow(settings: SchedulingSettings, date: LocalDate, now: Date): boolean {
  if (!settings.bookingEnabled) return false;
  const today = todayLocal(now, settings.timezone);
  if (compareDates(date, settings.bookingStartDate) < 0) return false;
  if (compareDates(date, today) < 0) return false;
  if (compareDates(date, addDays(today, settings.maxAdvanceDays)) > 0) return false;
  return true;
}

export function getSlotsForDate(
  ctx: SchedulingContext,
  date: LocalDate,
  durationMinutes: number,
  now: Date,
): Slot[] {
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) return [];
  const { settings } = ctx;
  if (!isDateInWindow(settings, date, now)) return [];

  const earliest = now.getTime() + settings.minNoticeMinutes * 60_000;
  const durationMs = durationMinutes * 60_000;
  const byTime = new Map<string, Slot>();

  for (const barberId of ctx.barberIds) {
    const busy = ctx.busy.filter((b) => b.barberId === barberId);
    for (const [openStart, openEnd] of openIntervalsFor(ctx, barberId, date)) {
      const closeAt = localToUtc(date, openEnd, settings.timezone).getTime();
      for (let m = openStart; m + durationMinutes <= openEnd; m += settings.slotIntervalMinutes) {
        const start = localToUtc(date, m, settings.timezone);
        const end = new Date(start.getTime() + durationMs);
        // Must finish by closing time (compared on absolute instants → DST-safe).
        if (end.getTime() > closeAt) continue;
        if (start.getTime() < earliest) continue;
        if (busy.some((b) => b.start.getTime() < end.getTime() && b.end.getTime() > start.getTime())) continue;
        const time = minutesToTime(m);
        const existing = byTime.get(time);
        if (existing) existing.barberIds.push(barberId);
        else byTime.set(time, { time, startsAt: start, endsAt: end, barberIds: [barberId] });
      }
    }
  }
  return [...byTime.values()].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/** Dates (within [from, to]) that have at least one bookable slot. */
export function getAvailableDates(
  ctx: SchedulingContext,
  from: LocalDate,
  to: LocalDate,
  durationMinutes: number,
  now: Date,
): LocalDate[] {
  const out: LocalDate[] = [];
  for (let d = from; compareDates(d, to) <= 0; d = addDays(d, 1)) {
    if (getSlotsForDate(ctx, d, durationMinutes, now).length > 0) out.push(d);
  }
  return out;
}
