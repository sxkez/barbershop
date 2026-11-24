import { z } from "zod";
import { getDb } from "@/lib/db";
import { cancelBookingByToken, rescheduleBookingByToken } from "@/lib/booking/service";
import { getSettings } from "@/lib/settings";
import { sendEmail, siteUrl } from "@/lib/email";
import { bookingCancelledEmail, bookingRescheduledEmail } from "@/lib/email/templates";
import { clientIp, errorResponse, json } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { localDate, localTime } from "@/lib/validation";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel"), token: z.string().min(32).max(128) }),
  z.object({ action: z.literal("reschedule"), token: z.string().min(32).max(128), date: localDate, time: localTime }),
]);

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Ungültige Anfrage." }, { status: 400 });
  try {
    const db = await getDb();
    const rl = await rateLimit(db, { bucket: "manage", identifier: await clientIp(), limit: 20, windowSeconds: 600 });
    if (!rl.allowed) return json({ error: "Zu viele Anfragen. Bitte versuche es später erneut." }, { status: 429 });
    const settings = await getSettings(db);
    const now = new Date();
    if (parsed.data.action === "cancel") {
      const b = await cancelBookingByToken(db, parsed.data.token, now);
      await sendEmail(db, { to: b.contactEmail, ...bookingCancelledEmail(b, settings), template: "booking_cancelled" });
      return json({ status: b.status });
    }
    const b = await rescheduleBookingByToken(db, parsed.data.token, parsed.data.date, parsed.data.time, now);
    const url = `${siteUrl()}/termin/verwalten/${parsed.data.token}`;
    await sendEmail(db, { to: b.contactEmail, ...bookingRescheduledEmail(b, settings, url), template: "booking_rescheduled" });
    return json({ status: b.status, date: b.localDate, time: b.localTime });
  } catch (err) {
    return errorResponse(err);
  }
}
