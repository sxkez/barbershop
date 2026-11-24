import { z } from "zod";
import { getDb } from "@/lib/db";
import { createAccessLink } from "@/lib/loyalty/service";
import { getSettings } from "@/lib/settings";
import { sendEmail, siteUrl } from "@/lib/email";
import { loyaltyLinkEmail } from "@/lib/email/templates";
import { clientIp, errorResponse, json } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().trim().toLowerCase().pipe(z.email()), website: z.string().max(0).optional() });

/** Always answers the same way, so it cannot be used to find out who is a member. */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Bitte gib eine gültige E-Mail-Adresse an." }, { status: 422 });
  try {
    const db = await getDb();
    const ip = await clientIp();
    const [a, b] = await Promise.all([
      rateLimit(db, { bucket: "club-link-ip", identifier: ip, limit: 5, windowSeconds: 900 }),
      rateLimit(db, { bucket: "club-link-email", identifier: parsed.data.email, limit: 3, windowSeconds: 3600 }),
    ]);
    if (!a.allowed || !b.allowed) return json({ error: "Zu viele Anfragen. Bitte versuche es später erneut." }, { status: 429 });
    const settings = await getSettings(db);
    if (settings.loyaltyEnabled) {
      const link = await createAccessLink(db, parsed.data.email);
      if (link) {
        const url = `${siteUrl()}/kundenclub/karte/${link.token}`;
        await sendEmail(db, { to: parsed.data.email, ...loyaltyLinkEmail(link.customerName, url, settings), template: "loyalty_link" });
      }
    }
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
