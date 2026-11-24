import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getDaySlots, getMonthAvailability } from "@/lib/booking/service";
import { isLocalDate } from "@/lib/time";
import { clientIp, errorResponse, json } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** GET /api/availability?service=<uuid>&month=YYYY-MM  → { dates }
 *  GET /api/availability?service=<uuid>&date=YYYY-MM-DD → { slots } */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const serviceId = sp.get("service") ?? "";
  const month = sp.get("month");
  const date = sp.get("date");
  try {
    const db = await getDb();
    const rl = await rateLimit(db, { bucket: "availability", identifier: await clientIp(), limit: 120, windowSeconds: 60 });
    if (!rl.allowed) return json({ error: "Zu viele Anfragen. Bitte warte einen Moment." }, { status: 429 });
    const now = new Date();
    if (date) {
      if (!isLocalDate(date)) return json({ error: "Ungültiges Datum" }, { status: 400 });
      const { slots } = await getDaySlots(db, { serviceId, date, now });
      return json({ date, slots: slots.map((s) => ({ time: s.time })) });
    }
    if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      const { dates } = await getMonthAvailability(db, { serviceId, month, now });
      return json({ month, dates });
    }
    return json({ error: "Parameter month oder date fehlt." }, { status: 400 });
  } catch (err) {
    return errorResponse(err);
  }
}
