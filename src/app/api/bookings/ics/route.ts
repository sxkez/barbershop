import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getBookingByToken } from "@/lib/booking/service";
import { getSettings } from "@/lib/settings";
import { bookingIcs } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const db = await getDb();
  const booking = await getBookingByToken(db, token, new Date());
  if (!booking || booking.status !== "confirmed") return new Response("Nicht gefunden", { status: 404 });
  const ics = bookingIcs(booking, await getSettings(db));
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="hani-termin-${booking.reference}.ics"`,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
