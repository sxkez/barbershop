import { describe, expect, it } from "vitest";
import { getAvailableDates, getSlotsForDate, type SchedulingContext } from "@/lib/booking/availability";
import { localToUtc, utcToLocal } from "@/lib/time";

const BARBER = "b1";

function ctx(over: Partial<SchedulingContext> = {}): SchedulingContext {
  return {
    settings: {
      bookingEnabled: true,
      bookingStartDate: "2027-01-01",
      slotIntervalMinutes: 30,
      minNoticeMinutes: 120,
      maxAdvanceDays: 400,
      timezone: "Europe/Berlin",
    },
    barberIds: [BARBER],
    rules: [
      { barberId: null, weekday: 1, start: "10:00", end: "19:00", validFrom: "2027-01-01", validUntil: null },
      { barberId: null, weekday: 2, start: "10:00", end: "19:00", validFrom: "2027-01-01", validUntil: null },
    ],
    exceptions: [],
    busy: [],
    ...over,
  };
}

const NOW = new Date("2026-12-01T12:00:00Z");

describe("weekday restriction", () => {
  it("only Monday and Tuesday have slots", () => {
    // 2027-01-04 = Monday … 2027-01-10 = Sunday
    const dates = getAvailableDates(ctx(), "2027-01-04", "2027-01-10", 30, NOW);
    expect(dates).toEqual(["2027-01-04", "2027-01-05"]);
  });

  it("whole January 2027 only offers Mondays and Tuesdays", () => {
    const dates = getAvailableDates(ctx(), "2027-01-01", "2027-01-31", 30, NOW);
    for (const d of dates) {
      const wd = new Date(`${d}T12:00:00Z`).getUTCDay();
      expect([1, 2]).toContain(wd);
    }
    expect(dates).toHaveLength(8);
  });
});

describe("January 2027 minimum date", () => {
  it("has no slots before 2027-01-01 even on Mondays/Tuesdays", () => {
    const c = ctx({
      rules: [{ barberId: null, weekday: 1, start: "10:00", end: "19:00", validFrom: null, validUntil: null }],
    });
    expect(getSlotsForDate(c, "2026-12-28", 30, NOW)).toHaveLength(0); // Monday
    expect(getSlotsForDate(c, "2027-01-04", 30, NOW).length).toBeGreaterThan(0);
  });
});

describe("durations and closing time", () => {
  it("30-minute service: 18 slots from 10:00 to 18:30", () => {
    const slots = getSlotsForDate(ctx(), "2027-01-04", 30, NOW);
    expect(slots).toHaveLength(18);
    expect(slots[0].time).toBe("10:00");
    expect(slots.at(-1)!.time).toBe("18:30");
  });

  it("60-minute service ends exactly at closing time at the latest", () => {
    const slots = getSlotsForDate(ctx(), "2027-01-04", 60, NOW);
    expect(slots.at(-1)!.time).toBe("18:00");
    expect(utcToLocal(slots.at(-1)!.endsAt).time).toBe("19:00");
  });

  it("45-minute service never runs past 19:00", () => {
    const slots = getSlotsForDate(ctx(), "2027-01-04", 45, NOW);
    for (const s of slots) expect(utcToLocal(s.endsAt).minutes).toBeLessThanOrEqual(19 * 60);
    expect(slots.at(-1)!.time).toBe("18:00");
  });

  it("service longer than opening hours has no slots", () => {
    expect(getSlotsForDate(ctx(), "2027-01-04", 600, NOW)).toHaveLength(0);
  });
});

describe("bookings, breaks, closures", () => {
  it("existing booking blocks overlapping starts", () => {
    const busy = [{ barberId: BARBER, start: localToUtc("2027-01-04", "11:00"), end: localToUtc("2027-01-04", "12:00") }];
    const times = getSlotsForDate(ctx({ busy }), "2027-01-04", 30, NOW).map((s) => s.time);
    expect(times).not.toContain("11:00");
    expect(times).not.toContain("11:30");
    expect(times).toContain("10:30");
    expect(times).toContain("12:00");
  });

  it("60-minute service cannot start 30 minutes before an existing booking", () => {
    const busy = [{ barberId: BARBER, start: localToUtc("2027-01-04", "11:00"), end: localToUtc("2027-01-04", "11:30") }];
    const times = getSlotsForDate(ctx({ busy }), "2027-01-04", 60, NOW).map((s) => s.time);
    expect(times).not.toContain("10:30");
    expect(times).toContain("10:00");
  });

  it("break exception removes slots", () => {
    const exceptions = [{ barberId: null, date: "2027-01-04", start: "13:00", end: "14:00", kind: "break" as const }];
    const times = getSlotsForDate(ctx({ exceptions }), "2027-01-04", 30, NOW).map((s) => s.time);
    expect(times).not.toContain("13:00");
    expect(times).not.toContain("13:30");
    expect(times).toContain("14:00");
  });

  it("holiday closure removes the whole day", () => {
    const exceptions = [{ barberId: null, date: "2027-01-05", start: null, end: null, kind: "closed" as const }];
    expect(getSlotsForDate(ctx({ exceptions }), "2027-01-05", 30, NOW)).toHaveLength(0);
  });

  it("extra opening adds a day", () => {
    const exceptions = [{ barberId: null, date: "2027-01-06", start: "10:00", end: "12:00", kind: "extra_open" as const }];
    expect(getSlotsForDate(ctx({ exceptions }), "2027-01-06", 30, NOW)).toHaveLength(4);
  });

  it("booking disabled → no slots", () => {
    const c = ctx();
    c.settings.bookingEnabled = false;
    expect(getSlotsForDate(c, "2027-01-04", 30, NOW)).toHaveLength(0);
  });
});

describe("past and notice period", () => {
  it("no slots in the past or within the notice period", () => {
    const now = localToUtc("2027-01-04", "12:10");
    const times = getSlotsForDate(ctx(), "2027-01-04", 30, now).map((s) => s.time);
    expect(times[0]).toBe("14:30"); // 12:10 + 120 min = 14:10 → next slot 14:30
  });

  it("no slots on a past date", () => {
    const now = localToUtc("2027-01-06", "09:00");
    expect(getSlotsForDate(ctx(), "2027-01-05", 30, now)).toHaveLength(0);
  });

  it("respects the maximum advance window", () => {
    const c = ctx();
    c.settings.maxAdvanceDays = 30;
    expect(getSlotsForDate(c, "2027-03-01", 30, NOW)).toHaveLength(0);
  });
});

describe("Europe/Berlin daylight saving time", () => {
  it("winter: 10:00 local = 09:00 UTC", () => {
    expect(localToUtc("2027-03-22", "10:00").toISOString()).toBe("2027-03-22T09:00:00.000Z");
  });

  it("summer (after 28 Mar 2027 switch): 10:00 local = 08:00 UTC", () => {
    expect(localToUtc("2027-03-29", "10:00").toISOString()).toBe("2027-03-29T08:00:00.000Z");
    const slots = getSlotsForDate(ctx(), "2027-03-29", 30, NOW);
    expect(slots[0].startsAt.toISOString()).toBe("2027-03-29T08:00:00.000Z");
    expect(slots.at(-1)!.endsAt.toISOString()).toBe("2027-03-29T17:00:00.000Z");
  });

  it("back to winter time after 31 Oct 2027", () => {
    const slots = getSlotsForDate(ctx(), "2027-11-01", 30, NOW);
    expect(slots[0].startsAt.toISOString()).toBe("2027-11-01T09:00:00.000Z");
    expect(slots).toHaveLength(18);
  });

  it("DST switch day with extra opening keeps real 30-minute durations", () => {
    const exceptions = [{ barberId: null, date: "2027-03-28", start: "01:00", end: "04:00", kind: "extra_open" as const }];
    const slots = getSlotsForDate(ctx({ exceptions }), "2027-03-28", 30, NOW);
    for (const s of slots) expect(s.endsAt.getTime() - s.startsAt.getTime()).toBe(30 * 60_000);
    // 01:00–04:00 local is only 2 real hours on this day; no slot may end after 04:00 local.
    for (const s of slots) expect(s.endsAt.getTime()).toBeLessThanOrEqual(localToUtc("2027-03-28", "04:00").getTime());
  });
});

describe("multiple barbers", () => {
  it("slot stays available while any barber is free", () => {
    const busy = [{ barberId: "b1", start: localToUtc("2027-01-04", "10:00"), end: localToUtc("2027-01-04", "10:30") }];
    const slots = getSlotsForDate(ctx({ barberIds: ["b1", "b2"], busy }), "2027-01-04", 30, NOW);
    expect(slots[0].time).toBe("10:00");
    expect(slots[0].barberIds).toEqual(["b2"]);
  });
});
