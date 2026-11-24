import type { Db, Queryable } from "@/lib/db/types";
import { isExclusionViolation, isUniqueViolation } from "@/lib/db/types";
import { audit, type AuditActor } from "@/lib/audit";
import { getSettings, type BusinessSettings } from "@/lib/settings";
import { bookingReference, randomToken, sha256 } from "@/lib/security";
import { addDays, localToUtc, monthRange, utcToLocal, type LocalDate } from "@/lib/time";
import {
  getAvailableDates,
  getSlotsForDate,
  type AvailabilityException,
  type AvailabilityRule,
  type SchedulingContext,
  type Slot,
} from "./availability";

export type BookingStatus = "confirmed" | "cancelled" | "completed" | "no_show";

export class BookingError extends Error {
  constructor(
    public code:
      | "SERVICE_UNAVAILABLE"
      | "SLOT_UNAVAILABLE"
      | "SLOT_TAKEN"
      | "NOT_FOUND"
      | "TOO_LATE"
      | "INVALID_STATE"
      | "IDEMPOTENCY_CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "BookingError";
  }
}

export type BookableService = {
  id: string;
  slug: string;
  name: string;
  durationMinutes: number;
  priceCents: number | null;
  pricePublished: boolean;
};

export type BookingView = {
  id: string;
  reference: string;
  status: BookingStatus;
  serviceId: string | null;
  serviceName: string;
  durationMinutes: number;
  priceCents: number | null;
  startsAt: Date;
  endsAt: Date;
  localDate: LocalDate;
  localTime: string;
  barberId: string;
  barberName: string;
  customerId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string | null;
  source: "online" | "admin";
  createdAt: Date;
  cancelledAt: Date | null;
};

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** A service can be booked online only when it is active, enabled and fully configured. */
export async function getBookableService(q: Queryable, serviceId: string): Promise<BookableService | null> {
  if (!/^[0-9a-f-]{36}$/i.test(serviceId)) return null;
  const rows = await q.query<Record<string, unknown>>(
    `select id, slug, name, duration_minutes, price_cents, price_published
       from services
      where id = $1 and active and archived_at is null and online_bookable and duration_minutes > 0`,
    [serviceId],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id as string,
    slug: r.slug as string,
    name: r.name as string,
    durationMinutes: r.duration_minutes as number,
    priceCents: (r.price_cents as number) ?? null,
    pricePublished: r.price_published as boolean,
  };
}

export async function loadSchedulingContext(
  q: Queryable,
  settings: BusinessSettings,
  from: LocalDate,
  to: LocalDate,
  opts: { excludeBookingId?: string } = {},
): Promise<SchedulingContext> {
  const tz = settings.timezone;
  const [barbers, rules, exceptions, busy] = await Promise.all([
    q.query<{ id: string }>("select id from barbers where active order by sort_order, created_at"),
    q.query<Record<string, unknown>>(
      "select barber_id, weekday, to_char(start_time, 'HH24:MI') as start, to_char(end_time, 'HH24:MI') as end, valid_from, valid_until from availability_rules",
    ),
    q.query<Record<string, unknown>>(
      `select barber_id, date, to_char(start_time, 'HH24:MI') as start, to_char(end_time, 'HH24:MI') as end, kind
         from availability_exceptions where date between $1 and $2`,
      [from, to],
    ),
    q.query<Record<string, unknown>>(
      `select barber_id, starts_at, ends_at from bookings
        where status <> 'cancelled' and starts_at < $2 and ends_at > $1 and ($3::uuid is null or id <> $3::uuid)`,
      [localToUtc(from, 0, tz).toISOString(), localToUtc(addDays(to, 1), 0, tz).toISOString(), opts.excludeBookingId ?? null],
    ),
  ]);
  return {
    settings: settings.scheduling,
    barberIds: barbers.map((b) => b.id),
    rules: rules.map(
      (r): AvailabilityRule => ({
        barberId: (r.barber_id as string) ?? null,
        weekday: Number(r.weekday),
        start: r.start as string,
        end: r.end as string,
        validFrom: (r.valid_from as string) ?? null,
        validUntil: (r.valid_until as string) ?? null,
      }),
    ),
    exceptions: exceptions.map(
      (x): AvailabilityException => ({
        barberId: (x.barber_id as string) ?? null,
        date: x.date as string,
        start: (x.start as string) ?? null,
        end: (x.end as string) ?? null,
        kind: x.kind as AvailabilityException["kind"],
      }),
    ),
    busy: busy.map((b) => ({
      barberId: b.barber_id as string,
      start: new Date(b.starts_at as string),
      end: new Date(b.ends_at as string),
    })),
  };
}

export async function getDaySlots(
  q: Queryable,
  args: { serviceId: string; date: LocalDate; now: Date; excludeBookingId?: string },
): Promise<{ service: BookableService; slots: Slot[] }> {
  const service = await getBookableService(q, args.serviceId);
  if (!service) throw new BookingError("SERVICE_UNAVAILABLE", "Diese Leistung ist derzeit nicht online buchbar.");
  const settings = await getSettings(q);
  const ctx = await loadSchedulingContext(q, settings, args.date, args.date, { excludeBookingId: args.excludeBookingId });
  return { service, slots: getSlotsForDate(ctx, args.date, service.durationMinutes, args.now) };
}

export async function getMonthAvailability(
  q: Queryable,
  args: { serviceId: string; month: string; now: Date },
): Promise<{ service: BookableService; dates: LocalDate[] }> {
  const service = await getBookableService(q, args.serviceId);
  if (!service) throw new BookingError("SERVICE_UNAVAILABLE", "Diese Leistung ist derzeit nicht online buchbar.");
  const settings = await getSettings(q);
  const { from, to } = monthRange(args.month);
  const ctx = await loadSchedulingContext(q, settings, from, to);
  return { service, dates: getAvailableDates(ctx, from, to, service.durationMinutes, args.now) };
}

const BOOKING_SELECT = `
  select b.*, br.name as barber_name
    from bookings b join barbers br on br.id = b.barber_id`;

export function mapBooking(r: Record<string, unknown>, tz = "Europe/Berlin"): BookingView {
  const startsAt = new Date(r.starts_at as string);
  const local = utcToLocal(startsAt, tz);
  return {
    id: r.id as string,
    reference: r.reference as string,
    status: r.status as BookingStatus,
    serviceId: (r.service_id as string) ?? null,
    serviceName: r.service_name as string,
    durationMinutes: r.duration_minutes as number,
    priceCents: (r.price_cents as number) ?? null,
    startsAt,
    endsAt: new Date(r.ends_at as string),
    localDate: local.date,
    localTime: local.time,
    barberId: r.barber_id as string,
    barberName: (r.barber_name as string) ?? "",
    customerId: r.customer_id as string,
    contactName: r.contact_name as string,
    contactEmail: r.contact_email as string,
    contactPhone: r.contact_phone as string,
    notes: (r.notes as string) ?? null,
    source: r.source as "online" | "admin",
    createdAt: new Date(r.created_at as string),
    cancelledAt: r.cancelled_at ? new Date(r.cancelled_at as string) : null,
  };
}

export async function getBookingById(q: Queryable, id: string): Promise<BookingView | null> {
  const rows = await q.query(`${BOOKING_SELECT} where b.id = $1`, [id]);
  return rows[0] ? mapBooking(rows[0]) : null;
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export type CreateBookingInput = {
  serviceId: string;
  date: LocalDate;
  time: string;
  fullName: string;
  email: string;
  phone: string;
  notes?: string | null;
  idempotencyKey: string;
};

export type CreateBookingResult = {
  booking: BookingView;
  /** Plain manage token — only returned when the booking was created by this call. */
  manageToken: string | null;
  created: boolean;
};

async function upsertCustomer(
  q: Queryable,
  input: { fullName: string; email: string; phone: string },
  now: Date,
): Promise<string> {
  const email = input.email.trim().toLowerCase();
  await q.query(
    `insert into customers (full_name, email, phone, privacy_accepted_at)
     values ($1, $2, $3, $4)
     on conflict (lower(email)) where anonymized_at is null do nothing`,
    [input.fullName.trim(), email, input.phone.trim(), now.toISOString()],
  );
  const [row] = await q.query<{ id: string }>(
    "select id from customers where lower(email) = $1 and anonymized_at is null",
    [email],
  );
  return row.id;
}

/**
 * Creates an online booking. Availability is re-validated on the server, the
 * insert is protected by the bookings_no_overlap exclusion constraint, and the
 * idempotency key makes retries safe.
 */
export async function createBooking(
  db: Db,
  input: CreateBookingInput,
  opts: { now: Date; source?: "online" | "admin"; actor?: AuditActor; skipWindowChecks?: boolean },
): Promise<CreateBookingResult> {
  const now = opts.now;
  const source = opts.source ?? "online";

  // 1. Idempotent replay
  const existing = await db.query(`${BOOKING_SELECT} where b.idempotency_key = $1`, [input.idempotencyKey]);
  if (existing[0]) {
    const booking = mapBooking(existing[0]);
    const sameRequest =
      booking.serviceId === input.serviceId && booking.localDate === input.date && booking.localTime === input.time;
    if (!sameRequest) {
      throw new BookingError("IDEMPOTENCY_CONFLICT", "Diese Anfrage wurde bereits mit anderen Daten gesendet.");
    }
    return { booking, manageToken: null, created: false };
  }

  // 2. Service + server-side availability check
  const settings = await getSettings(db);
  let service: BookableService | null;
  let candidates: string[];
  let startsAt: Date;
  let endsAt: Date;

  if (opts.skipWindowChecks) {
    const rows = await db.query<Record<string, unknown>>(
      "select id, slug, name, duration_minutes, price_cents, price_published from services where id = $1 and archived_at is null",
      [input.serviceId],
    );
    const r = rows[0];
    service = r
      ? {
          id: r.id as string,
          slug: r.slug as string,
          name: r.name as string,
          durationMinutes: r.duration_minutes as number,
          priceCents: (r.price_cents as number) ?? null,
          pricePublished: r.price_published as boolean,
        }
      : null;
    if (!service) throw new BookingError("SERVICE_UNAVAILABLE", "Leistung nicht gefunden.");
    startsAt = localToUtc(input.date, input.time, settings.timezone);
    endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);
    candidates = (await db.query<{ id: string }>("select id from barbers where active order by sort_order, created_at")).map(
      (b) => b.id,
    );
  } else {
    const { service: s, slots } = await getDaySlots(db, { serviceId: input.serviceId, date: input.date, now });
    service = s;
    const slot = slots.find((x) => x.time === input.time);
    if (!slot) {
      throw new BookingError("SLOT_UNAVAILABLE", "Dieser Termin ist nicht (mehr) verfügbar. Bitte wähle eine andere Uhrzeit.");
    }
    candidates = slot.barberIds;
    startsAt = slot.startsAt;
    endsAt = slot.endsAt;
  }

  const manageToken = randomToken();
  const tokenHash = sha256(manageToken);

  // 3. Write — try each free barber; the exclusion constraint resolves races.
  for (const barberId of candidates) {
    for (let refAttempt = 0; refAttempt < 3; refAttempt++) {
      try {
        const id = await db.tx(async (q) => {
          const customerId = await upsertCustomer(q, input, now);
          const [row] = await q.query<{ id: string }>(
            `insert into bookings (reference, barber_id, service_id, customer_id, starts_at, ends_at, status,
                                   contact_name, contact_email, contact_phone,
                                   service_name, price_cents, duration_minutes, notes, source,
                                   manage_token_hash, manage_token_expires_at, idempotency_key)
             values ($1, $2, $3, $4, $5, $6, 'confirmed', $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
             returning id`,
            [
              bookingReference(),
              barberId,
              service!.id,
              customerId,
              startsAt.toISOString(),
              endsAt.toISOString(),
              input.fullName.trim(),
              input.email.trim().toLowerCase(),
              input.phone.trim(),
              service!.name,
              service!.pricePublished ? service!.priceCents : null,
              service!.durationMinutes,
              input.notes?.trim() || null,
              source,
              tokenHash,
              endsAt.toISOString(),
              input.idempotencyKey,
            ],
          );
          await audit(q, opts.actor ?? { type: "customer" }, "booking.created", "booking", row.id, {
            source,
            service: service!.slug,
          });
          return row.id;
        });
        const booking = (await getBookingById(db, id))!;
        return { booking, manageToken, created: true };
      } catch (err) {
        if (isExclusionViolation(err)) break; // this barber got taken → next barber
        if (isUniqueViolation(err, "bookings_idempotency_key_key") || isUniqueViolation(err, "idempotency_key")) {
          // A concurrent request with the same key won the race: replay it.
          return createBooking(db, input, opts);
        }
        if (isUniqueViolation(err, "bookings_reference_key") || isUniqueViolation(err, "reference")) continue;
        throw err;
      }
    }
  }
  throw new BookingError("SLOT_TAKEN", "Dieser Termin wurde gerade vergeben. Bitte wähle eine andere Uhrzeit.");
}

// ---------------------------------------------------------------------------
// Customer self-service via manage token
// ---------------------------------------------------------------------------

export async function getBookingByToken(q: Queryable, token: string, now: Date): Promise<BookingView | null> {
  if (!token || token.length < 32 || token.length > 128) return null;
  const rows = await q.query(`${BOOKING_SELECT} where b.manage_token_hash = $1 and b.manage_token_expires_at > $2`, [
    sha256(token),
    now.toISOString(),
  ]);
  return rows[0] ? mapBooking(rows[0]) : null;
}

export function canCustomerChange(booking: BookingView, settings: BusinessSettings, now: Date) {
  if (booking.status !== "confirmed") return false;
  return booking.startsAt.getTime() - now.getTime() >= settings.cancellationNoticeMinutes * 60_000;
}

export async function cancelBookingByToken(db: Db, token: string, now: Date, reason?: string) {
  const booking = await getBookingByToken(db, token, now);
  if (!booking) throw new BookingError("NOT_FOUND", "Termin nicht gefunden oder Link abgelaufen.");
  const settings = await getSettings(db);
  if (!canCustomerChange(booking, settings, now)) {
    throw new BookingError("TOO_LATE", "Dieser Termin kann online nicht mehr storniert werden. Bitte ruf uns an.");
  }
  await db.tx(async (q) => {
    const rows = await q.query(
      `update bookings set status = 'cancelled', cancelled_at = $2, cancel_reason = $3, updated_at = $2
        where id = $1 and status = 'confirmed' returning id`,
      [booking.id, now.toISOString(), reason?.slice(0, 500) || "Vom Kunden storniert"],
    );
    if (!rows[0]) throw new BookingError("INVALID_STATE", "Der Termin wurde bereits geändert.");
    await audit(q, { type: "customer" }, "booking.cancelled", "booking", booking.id, { by: "customer" });
  });
  return (await getBookingById(db, booking.id))!;
}

async function moveBooking(db: Db, booking: BookingView, date: LocalDate, time: string, now: Date, actor: AuditActor, checkWindow: boolean) {
  if (!booking.serviceId) throw new BookingError("SERVICE_UNAVAILABLE", "Leistung nicht mehr verfügbar.");
  const settings = await getSettings(db);
  let candidates: string[];
  let startsAt: Date;
  let endsAt: Date;
  if (checkWindow) {
    const { slots } = await getDaySlots(db, { serviceId: booking.serviceId, date, now, excludeBookingId: booking.id });
    const slot = slots.find((s) => s.time === time);
    if (!slot) throw new BookingError("SLOT_UNAVAILABLE", "Dieser Termin ist nicht verfügbar.");
    candidates = [booking.barberId, ...slot.barberIds.filter((b) => b !== booking.barberId)].filter((b) =>
      slot.barberIds.includes(b),
    );
    startsAt = slot.startsAt;
    endsAt = slot.endsAt;
  } else {
    startsAt = localToUtc(date, time, settings.timezone);
    endsAt = new Date(startsAt.getTime() + booking.durationMinutes * 60_000);
    candidates = [booking.barberId];
  }
  for (const barberId of candidates) {
    try {
      await db.tx(async (q) => {
        const rows = await q.query(
          `update bookings set starts_at = $2, ends_at = $3, barber_id = $4, manage_token_expires_at = $3, updated_at = $5
            where id = $1 and status = 'confirmed' returning id`,
          [booking.id, startsAt.toISOString(), endsAt.toISOString(), barberId, now.toISOString()],
        );
        if (!rows[0]) throw new BookingError("INVALID_STATE", "Nur bestätigte Termine können verschoben werden.");
        await audit(q, actor, "booking.rescheduled", "booking", booking.id, {
          from: booking.startsAt.toISOString(),
          to: startsAt.toISOString(),
        });
      });
      return (await getBookingById(db, booking.id))!;
    } catch (err) {
      if (isExclusionViolation(err)) continue;
      throw err;
    }
  }
  throw new BookingError("SLOT_TAKEN", "Dieser Termin wurde gerade vergeben. Bitte wähle eine andere Uhrzeit.");
}

export async function rescheduleBookingByToken(db: Db, token: string, date: LocalDate, time: string, now: Date) {
  const booking = await getBookingByToken(db, token, now);
  if (!booking) throw new BookingError("NOT_FOUND", "Termin nicht gefunden oder Link abgelaufen.");
  const settings = await getSettings(db);
  if (!canCustomerChange(booking, settings, now)) {
    throw new BookingError("TOO_LATE", "Dieser Termin kann online nicht mehr verschoben werden. Bitte ruf uns an.");
  }
  return moveBooking(db, booking, date, time, now, { type: "customer" }, true);
}

// ---------------------------------------------------------------------------
// Admin operations
// ---------------------------------------------------------------------------

const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  confirmed: ["cancelled", "completed", "no_show"],
  completed: ["confirmed", "no_show"],
  no_show: ["confirmed", "completed"],
  cancelled: ["confirmed"],
};

export async function adminSetStatus(
  db: Db,
  args: { bookingId: string; status: BookingStatus; adminId: string; reason?: string; now: Date },
) {
  const booking = await getBookingById(db, args.bookingId);
  if (!booking) throw new BookingError("NOT_FOUND", "Termin nicht gefunden.");
  if (booking.status === args.status) return booking;
  if (!TRANSITIONS[booking.status].includes(args.status)) {
    throw new BookingError("INVALID_STATE", `Statuswechsel ${booking.status} → ${args.status} ist nicht erlaubt.`);
  }
  try {
    await db.tx(async (q) => {
      await q.query(
        `update bookings set status = $2::booking_status, updated_at = $3::timestamptz,
                cancelled_at = case when $2::text = 'cancelled' then $3::timestamptz else null end,
                cancel_reason = case when $2::text = 'cancelled' then $4::text else null end
          where id = $1`,
        [args.bookingId, args.status, args.now.toISOString(), args.reason ?? "Vom Shop storniert"],
      );
      await audit(q, { type: "admin", id: args.adminId }, `booking.${args.status}`, "booking", args.bookingId, {
        from: booking.status,
      });
    });
  } catch (err) {
    if (isExclusionViolation(err)) {
      throw new BookingError("SLOT_TAKEN", "Der Zeitraum ist inzwischen anderweitig belegt.");
    }
    throw err;
  }
  return (await getBookingById(db, args.bookingId))!;
}

export async function adminReschedule(
  db: Db,
  args: { bookingId: string; date: LocalDate; time: string; adminId: string; now: Date },
) {
  const booking = await getBookingById(db, args.bookingId);
  if (!booking) throw new BookingError("NOT_FOUND", "Termin nicht gefunden.");
  return moveBooking(db, booking, args.date, args.time, args.now, { type: "admin", id: args.adminId }, false);
}

export async function listBookings(q: Queryable, from: Date, to: Date): Promise<BookingView[]> {
  const rows = await q.query(`${BOOKING_SELECT} where b.starts_at < $2 and b.ends_at > $1 order by b.starts_at`, [
    from.toISOString(),
    to.toISOString(),
  ]);
  return rows.map((r) => mapBooking(r));
}
