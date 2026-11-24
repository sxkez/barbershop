import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db/types";
import {
  BookingError,
  adminSetStatus,
  cancelBookingByToken,
  createBooking,
  getBookingByToken,
  getDaySlots,
  getMonthAvailability,
  rescheduleBookingByToken,
} from "@/lib/booking/service";
import { NOW, bookingInput, freshDb, serviceId } from "./helpers";

let db: Db;
let classic: string;

beforeAll(async () => {
  db = await freshDb();
  classic = await serviceId(db, "paket-1-classic");
});
afterAll(async () => db.close());

describe("database-backed booking", () => {
  it("seeded schedule: January 2027 shows only Mondays and Tuesdays", async () => {
    const { dates } = await getMonthAvailability(db, { serviceId: classic, month: "2027-01", now: NOW });
    expect(dates).toEqual([
      "2027-01-04", "2027-01-05", "2027-01-11", "2027-01-12",
      "2027-01-18", "2027-01-19", "2027-01-25", "2027-01-26",
    ]);
    const dec = await getMonthAvailability(db, { serviceId: classic, month: "2026-12", now: NOW });
    expect(dec.dates).toHaveLength(0);
  });

  it("creates a booking and removes the slot", async () => {
    const res = await createBooking(db, bookingInput(classic, "2027-01-04", "10:00"), { now: NOW });
    expect(res.created).toBe(true);
    expect(res.booking.reference).toMatch(/^HANI-[A-Z2-9]{6}$/);
    expect(res.booking.startsAt.toISOString()).toBe("2027-01-04T09:00:00.000Z");
    expect(res.manageToken).toBeTruthy();
    const { slots } = await getDaySlots(db, { serviceId: classic, date: "2027-01-04", now: NOW });
    expect(slots.map((s) => s.time)).not.toContain("10:00");
  });

  it("rejects a second booking for the same slot", async () => {
    await createBooking(db, bookingInput(classic, "2027-01-04", "11:00"), { now: NOW });
    await expect(createBooking(db, bookingInput(classic, "2027-01-04", "11:00"), { now: NOW })).rejects.toMatchObject({
      code: "SLOT_UNAVAILABLE",
    });
  });

  it("database constraint blocks overlaps even when availability checks are bypassed", async () => {
    await createBooking(db, bookingInput(classic, "2027-01-04", "12:00"), { now: NOW });
    await expect(
      createBooking(db, bookingInput(classic, "2027-01-04", "12:15"), { now: NOW, source: "admin", skipWindowChecks: true }),
    ).rejects.toMatchObject({ code: "SLOT_TAKEN" });
  });

  it("simultaneous requests for one slot: exactly one wins", async () => {
    const attempts = await Promise.allSettled(
      Array.from({ length: 6 }, () =>
        createBooking(db, bookingInput(classic, "2027-01-05", "15:00"), { now: NOW, source: "admin", skipWindowChecks: true }),
      ),
    );
    const ok = attempts.filter((a) => a.status === "fulfilled");
    const failed = attempts.filter((a) => a.status === "rejected") as PromiseRejectedResult[];
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(5);
    for (const f of failed) expect((f.reason as BookingError).code).toBe("SLOT_TAKEN");
    const [{ count }] = await db.query<{ count: number }>(
      "select count(*)::int as count from bookings where starts_at = '2027-01-05T14:00:00Z' and status <> 'cancelled'",
    );
    expect(count).toBe(1);
  });

  it("same idempotency key returns the same booking instead of a duplicate", async () => {
    const input = bookingInput(classic, "2027-01-11", "10:00");
    const a = await createBooking(db, input, { now: NOW });
    const b = await createBooking(db, input, { now: NOW });
    expect(b.created).toBe(false);
    expect(b.booking.id).toBe(a.booking.id);
    await expect(createBooking(db, { ...input, time: "10:30" }, { now: NOW })).rejects.toMatchObject({
      code: "IDEMPOTENCY_CONFLICT",
    });
  });

  it("refuses services that are not enabled for online booking", async () => {
    const svc = await serviceId(db, "bart-trimmen"); // online_bookable = false in seed
    await expect(createBooking(db, bookingInput(svc, "2027-01-11", "12:00"), { now: NOW })).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
    });
  });

  it("refuses Wednesdays and pre-2027 dates on the server", async () => {
    await expect(createBooking(db, bookingInput(classic, "2027-01-06", "10:00"), { now: NOW })).rejects.toMatchObject({
      code: "SLOT_UNAVAILABLE",
    });
    await expect(createBooking(db, bookingInput(classic, "2026-12-28", "10:00"), { now: NOW })).rejects.toMatchObject({
      code: "SLOT_UNAVAILABLE",
    });
  });

  it("refuses appointments that would run past closing", async () => {
    await db.query("update services set duration_minutes = 60 where id = $1", [classic]);
    await expect(createBooking(db, bookingInput(classic, "2027-01-12", "18:30"), { now: NOW })).rejects.toMatchObject({
      code: "SLOT_UNAVAILABLE",
    });
    const ok = await createBooking(db, bookingInput(classic, "2027-01-12", "18:00"), { now: NOW });
    expect(ok.booking.endsAt.toISOString()).toBe("2027-01-12T18:00:00.000Z"); // 19:00 local
    await db.query("update services set duration_minutes = 30 where id = $1", [classic]);
  });

  it("cancellation reopens the slot", async () => {
    const res = await createBooking(db, bookingInput(classic, "2027-01-18", "10:00"), { now: NOW });
    const cancelled = await cancelBookingByToken(db, res.manageToken!, NOW);
    expect(cancelled.status).toBe("cancelled");
    const { slots } = await getDaySlots(db, { serviceId: classic, date: "2027-01-18", now: NOW });
    expect(slots.map((s) => s.time)).toContain("10:00");
    const again = await createBooking(db, bookingInput(classic, "2027-01-18", "10:00"), { now: NOW });
    expect(again.created).toBe(true);
  });

  it("manage tokens are not guessable from the reference and expire", async () => {
    const res = await createBooking(db, bookingInput(classic, "2027-01-18", "11:00"), { now: NOW });
    expect(await getBookingByToken(db, res.booking.reference, NOW)).toBeNull();
    expect(await getBookingByToken(db, res.booking.id, NOW)).toBeNull();
    expect(await getBookingByToken(db, res.manageToken!, NOW)).not.toBeNull();
    expect(await getBookingByToken(db, res.manageToken!, new Date("2027-01-19T00:00:00Z"))).toBeNull();
  });

  it("online cancellation is refused inside the notice period", async () => {
    const res = await createBooking(db, bookingInput(classic, "2027-01-19", "16:00"), { now: NOW });
    const late = new Date("2027-01-19T13:00:00Z"); // 14:00 local, 2h before (notice = 12h)
    await expect(cancelBookingByToken(db, res.manageToken!, late)).rejects.toMatchObject({ code: "TOO_LATE" });
  });

  it("rescheduling moves the booking and frees the old slot", async () => {
    const res = await createBooking(db, bookingInput(classic, "2027-01-25", "10:00"), { now: NOW });
    const moved = await rescheduleBookingByToken(db, res.manageToken!, "2027-01-26", "12:30", NOW);
    expect(moved.localDate).toBe("2027-01-26");
    expect(moved.localTime).toBe("12:30");
    const { slots } = await getDaySlots(db, { serviceId: classic, date: "2027-01-25", now: NOW });
    expect(slots.map((s) => s.time)).toContain("10:00");
  });

  it("rescheduling into a taken slot fails", async () => {
    const a = await createBooking(db, bookingInput(classic, "2027-01-25", "13:00"), { now: NOW });
    await createBooking(db, bookingInput(classic, "2027-01-25", "14:00"), { now: NOW });
    await expect(rescheduleBookingByToken(db, a.manageToken!, "2027-01-25", "14:00", NOW)).rejects.toBeInstanceOf(BookingError);
  });

  it("re-confirming a cancelled booking is blocked if the slot was taken", async () => {
    const a = await createBooking(db, bookingInput(classic, "2027-01-26", "16:00"), { now: NOW });
    await cancelBookingByToken(db, a.manageToken!, NOW);
    await createBooking(db, bookingInput(classic, "2027-01-26", "16:00"), { now: NOW });
    await expect(
      adminSetStatus(db, { bookingId: a.booking.id, status: "confirmed", adminId: "00000000-0000-4000-8000-000000000001", now: NOW }),
    ).rejects.toMatchObject({ code: "SLOT_TAKEN" });
  });

  it("status transitions are validated", async () => {
    const a = await createBooking(db, bookingInput(classic, "2027-01-26", "17:00"), { now: NOW });
    const admin = "00000000-0000-4000-8000-000000000001";
    const done = await adminSetStatus(db, { bookingId: a.booking.id, status: "completed", adminId: admin, now: NOW });
    expect(done.status).toBe("completed");
    await expect(adminSetStatus(db, { bookingId: a.booking.id, status: "cancelled", adminId: admin, now: NOW })).rejects.toMatchObject({
      code: "INVALID_STATE",
    });
  });
});
