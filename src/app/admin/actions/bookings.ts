"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { adminReschedule, adminSetStatus, createBooking, getBookingById, type BookingStatus } from "@/lib/booking/service";
import { stampForCompletedBooking } from "@/lib/loyalty/service";
import { getSettings } from "@/lib/settings";
import { sendEmail } from "@/lib/email";
import { bookingCancelledEmail, bookingConfirmationEmail, bookingIcs, bookingRescheduledEmail } from "@/lib/email/templates";
import { customerFields, localDate, localTime } from "@/lib/validation";
import { bool, done, errMsg, str } from "./_helpers";

const STATUSES: BookingStatus[] = ["confirmed", "cancelled", "completed", "no_show"];

export async function setBookingStatusAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const status = str(fd, "status") as BookingStatus;
  const notify = bool(fd, "notify");
  const back = `/admin/termine/${id}`;
  if (!STATUSES.includes(status)) done(back, { error: "Ungültiger Status." });
  let msg: string;
  try {
    const db = await getDb();
    const b = await adminSetStatus(db, { bookingId: id, status, adminId: admin.userId, reason: str(fd, "reason") || undefined, now: new Date() });
    msg = "Status aktualisiert.";
    if (status === "completed") {
      const stamped = await stampForCompletedBooking(db, id, admin.userId);
      if (stamped && !stamped.duplicate) msg += " Stempel automatisch vergeben.";
    }
    if (status === "cancelled" && notify) {
      await sendEmail(db, { to: b.contactEmail, ...bookingCancelledEmail(b, await getSettings(db)), template: "booking_cancelled" });
      msg += " Kunde per E-Mail informiert.";
    }
  } catch (err) {
    done(back, { error: errMsg(err) });
  }
  done(back, { ok: msg });
}

export async function rescheduleBookingAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const back = `/admin/termine/${id}`;
  const parsed = z.object({ date: localDate, time: localTime }).safeParse({ date: str(fd, "date"), time: str(fd, "time") });
  if (!parsed.success) done(back, { error: "Bitte gültiges Datum und Uhrzeit angeben." });
  try {
    const db = await getDb();
    const b = await adminReschedule(db, { bookingId: id, ...parsed.data!, adminId: admin.userId, now: new Date() });
    if (bool(fd, "notify")) {
      await sendEmail(db, { to: b.contactEmail, ...bookingRescheduledEmail(b, await getSettings(db), null), template: "booking_rescheduled" });
    }
  } catch (err) {
    done(back, { error: errMsg(err) });
  }
  done(back, { ok: "Termin verschoben." });
}

export async function resendConfirmationAction(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const db = await getDb();
  const b = await getBookingById(db, id);
  if (!b) done("/admin/termine", { error: "Termin nicht gefunden." });
  const settings = await getSettings(db);
  // The original manage link cannot be recovered (only its hash is stored), so the resent mail has no manage link.
  const r = await sendEmail(db, {
    to: b!.contactEmail,
    ...bookingConfirmationEmail(b!, settings, null),
    template: "booking_confirmation_resend",
    attachments: [{ filename: "hani-termin.ics", content: bookingIcs(b!, settings), contentType: "text/calendar" }],
  });
  done(`/admin/termine/${id}`, r.ok ? { ok: "Bestätigung erneut gesendet." } : { error: "E-Mail konnte nicht gesendet werden." });
}

const manualSchema = z.object({
  serviceId: z.uuid({ error: "Bitte Leistung wählen." }),
  date: localDate,
  time: localTime,
  ...customerFields,
  notes: z.string().max(500).optional(),
});

export async function createManualBookingAction(fd: FormData) {
  const admin = await requireAdmin();
  const parsed = manualSchema.safeParse({
    serviceId: str(fd, "serviceId"),
    date: str(fd, "date"),
    time: str(fd, "time"),
    fullName: str(fd, "fullName"),
    phone: str(fd, "phone"),
    email: str(fd, "email"),
    notes: str(fd, "notes"),
  });
  if (!parsed.success) done("/admin/termine/neu", { error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen." });
  const input = parsed.data!;
  let id: string;
  try {
    const db = await getDb();
    const res = await createBooking(
      db,
      { ...input, idempotencyKey: str(fd, "idempotencyKey") || randomUUID() },
      { now: new Date(), source: "admin", actor: { type: "admin", id: admin.userId }, skipWindowChecks: true },
    );
    id = res.booking.id;
    if (res.created && bool(fd, "notify")) {
      const settings = await getSettings(db);
      const manageUrl = res.manageToken ? `${(process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "")}/termin/verwalten/${res.manageToken}` : null;
      await sendEmail(db, {
        to: res.booking.contactEmail,
        ...bookingConfirmationEmail(res.booking, settings, manageUrl),
        template: "booking_confirmation",
        attachments: [{ filename: "hani-termin.ics", content: bookingIcs(res.booking, settings), contentType: "text/calendar" }],
      });
    }
  } catch (err) {
    done("/admin/termine/neu", { error: errMsg(err) });
  }
  done(`/admin/termine/${id}`, { ok: "Termin angelegt." });
}
