import { getDb } from "@/lib/db";
import { createBooking } from "@/lib/booking/service";
import { ensureAccount } from "@/lib/loyalty/service";
import { getSettings, fullAddress } from "@/lib/settings";
import { bookingConfirmationEmail, bookingIcs } from "@/lib/email/templates";
import { sendEmail, siteUrl } from "@/lib/email";
import { bookingRequestSchema, fieldErrors } from "@/lib/validation";
import { clientIp, errorResponse, json } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

const MIN_FILL_MS = 4_000; // humans need more than a few seconds to fill the form

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  const parsed = bookingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Bitte prüfe deine Angaben.", fields: fieldErrors(parsed.error) }, { status: 422 });
  }
  const input = parsed.data;

  try {
    const db = await getDb();
    const ip = await clientIp();
    const rl = await rateLimit(db, { bucket: "booking", identifier: ip, limit: 6, windowSeconds: 600 });
    if (!rl.allowed) {
      return json({ error: "Zu viele Buchungsversuche. Bitte versuche es später erneut oder ruf uns an." }, { status: 429 });
    }
    if (Date.now() - input.startedAt < MIN_FILL_MS) {
      return json({ error: "Bitte versuche es in ein paar Sekunden erneut." }, { status: 429 });
    }

    const result = await createBooking(
      db,
      {
        serviceId: input.serviceId,
        date: input.date,
        time: input.time,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        notes: input.notes,
        idempotencyKey: input.idempotencyKey,
      },
      { now: new Date() },
    );
    const settings = await getSettings(db);
    const b = result.booking;
    const manageUrl = result.manageToken ? `${siteUrl()}/termin/verwalten/${result.manageToken}` : null;

    let emailSent = false;
    if (result.created) {
      if (input.joinLoyalty && settings.loyaltyEnabled) {
        await ensureAccount(db, b.customerId, { type: "customer" }).catch((e) => console.error("[loyalty] opt-in failed", e?.message));
      }
      const mail = bookingConfirmationEmail(b, settings, manageUrl);
      const sent = await sendEmail(db, {
        to: b.contactEmail,
        ...mail,
        template: "booking_confirmation",
        attachments: [{ filename: "hani-termin.ics", content: bookingIcs(b, settings), contentType: "text/calendar" }],
      });
      emailSent = sent.ok && Boolean(process.env.RESEND_API_KEY);
    }

    return json(
      {
        booking: {
          reference: b.reference,
          serviceName: b.serviceName,
          date: b.localDate,
          time: b.localTime,
          durationMinutes: b.durationMinutes,
          price: b.priceCents != null ? formatPrice(b.priceCents) : null,
          location: fullAddress(settings),
          cancellationHours: Math.round(settings.cancellationNoticeMinutes / 60),
          phone: settings.phone,
        },
        manageUrl: manageUrl ? manageUrl.replace(siteUrl(), "") : null,
        created: result.created,
        emailSent,
      },
      { status: result.created ? 201 : 200 },
    );
  } catch (err) {
    return errorResponse(err);
  }
}
