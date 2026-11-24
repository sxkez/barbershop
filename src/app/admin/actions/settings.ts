"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { audit } from "@/lib/audit";
import { isLocalDate } from "@/lib/time";
import { bool, done, int, optStr, str } from "./_helpers";

const BACK = "/admin/einstellungen";

function httpsUrl(v: string | null, label: string): string | null {
  if (!v) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:") throw new Error();
    return u.toString();
  } catch {
    done(BACK, { error: `${label}: bitte eine gültige https://-Adresse angeben.` });
  }
}

function lines(v: string) {
  return v
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split("|").map((x) => x.trim()));
}

export async function saveSettingsAction(fd: FormData) {
  const admin = await requireAdmin();
  const walkInHours = lines(str(fd, "walkInHours")).map(([days, hours]) => ({ days, hours: hours ?? "" }));
  const socialLinks = lines(str(fd, "socialLinks")).map(([network, label, url]) => ({
    network: (network ?? "").toLowerCase(),
    label: label ?? network,
    url: httpsUrl(url || null, `Social-Link ${network}`),
  }));
  const startDate = str(fd, "bookingStartDate");
  if (!isLocalDate(startDate)) done(BACK, { error: "Ungültiges Startdatum für Online-Buchungen." });
  const num = (k: string, min: number, max: number, label: string) => {
    const n = int(fd, k);
    if (n === null || n < min || n > max) done(BACK, { error: `${label} muss zwischen ${min} und ${max} liegen.` });
    return n!;
  };
  const slot = num("slotInterval", 5, 120, "Raster");
  const minNoticeH = num("minNoticeHours", 0, 168, "Vorlauf");
  const maxAdvance = num("maxAdvanceDays", 1, 730, "Buchungshorizont");
  const cancelH = num("cancellationHours", 0, 168, "Stornofrist");
  const stamps = num("stampsRequired", 1, 50, "Stempelanzahl");
  const mode = str(fd, "physicalMode") === "separate" ? "separate" : "manual_migration";
  const email = optStr(fd, "email");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) done(BACK, { error: "Ungültige E-Mail-Adresse." });

  const db = await getDb();
  await db.query(
    `update business_settings set
       name=$1, street=$2, postal_code=$3, city=$4, phone=$5, email=$6,
       walk_in_hours=$7, walk_in_note=$8, walk_in_confirmed=$9,
       maps_url=$10, google_review_url=$11, social_links=$12, email_from=$13, email_reply_to=$14,
       booking_enabled=$15, booking_start_date=$16, slot_interval_minutes=$17, min_notice_minutes=$18, max_advance_days=$19,
       cancellation_notice_minutes=$20,
       loyalty_enabled=$21, loyalty_stamps_required=$22, loyalty_reward_text=$23, loyalty_reward_confirmed=$24,
       loyalty_auto_stamp_on_complete=$25, loyalty_physical_mode=$26, updated_at=now()
     where id = 1`,
    [
      str(fd, "name") || "HANI BARBERSHOP",
      str(fd, "street"),
      str(fd, "postalCode"),
      str(fd, "city"),
      str(fd, "phone"),
      email,
      JSON.stringify(walkInHours),
      optStr(fd, "walkInNote"),
      bool(fd, "walkInConfirmed"),
      httpsUrl(optStr(fd, "mapsUrl"), "Google-Maps-Link"),
      httpsUrl(optStr(fd, "googleReviewUrl"), "Google-Bewertungslink"),
      JSON.stringify(socialLinks),
      optStr(fd, "emailFrom"),
      optStr(fd, "emailReplyTo"),
      bool(fd, "bookingEnabled"),
      startDate,
      slot,
      minNoticeH * 60,
      maxAdvance,
      cancelH * 60,
      bool(fd, "loyaltyEnabled"),
      stamps,
      optStr(fd, "rewardText"),
      bool(fd, "rewardConfirmed"),
      bool(fd, "autoStamp"),
      mode,
    ],
  );
  await audit(db, { type: "admin", id: admin.userId }, "settings.updated", "business_settings", "1");
  revalidatePath("/", "layout");
  done(BACK, { ok: "Einstellungen gespeichert." });
}
