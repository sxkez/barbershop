import type { Queryable } from "@/lib/db/types";
import type { SchedulingSettings } from "@/lib/booking/availability";

export type WalkInHours = { days: string; hours: string }[];
export type SocialLink = { network: string; label: string; url: string | null };

export type BusinessSettings = {
  name: string;
  street: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string | null;
  timezone: string;
  walkInHours: WalkInHours;
  walkInNote: string | null;
  walkInConfirmed: boolean;
  mapsUrl: string | null;
  googleReviewUrl: string | null;
  socialLinks: SocialLink[];
  emailFrom: string | null;
  emailReplyTo: string | null;
  cancellationNoticeMinutes: number;
  loyaltyEnabled: boolean;
  loyaltyStampsRequired: number;
  loyaltyRewardText: string | null;
  loyaltyRewardConfirmed: boolean;
  loyaltyAutoStampOnComplete: boolean;
  loyaltyPhysicalMode: "manual_migration" | "separate";
  scheduling: SchedulingSettings;
};

type Row = Record<string, unknown>;

export function mapSettings(r: Row): BusinessSettings {
  return {
    name: r.name as string,
    street: r.street as string,
    postalCode: r.postal_code as string,
    city: r.city as string,
    phone: r.phone as string,
    email: (r.email as string) ?? null,
    timezone: r.timezone as string,
    walkInHours: (r.walk_in_hours as WalkInHours) ?? [],
    walkInNote: (r.walk_in_note as string) ?? null,
    walkInConfirmed: r.walk_in_confirmed as boolean,
    mapsUrl: (r.maps_url as string) ?? null,
    googleReviewUrl: (r.google_review_url as string) ?? null,
    socialLinks: (r.social_links as SocialLink[]) ?? [],
    emailFrom: (r.email_from as string) ?? null,
    emailReplyTo: (r.email_reply_to as string) ?? null,
    cancellationNoticeMinutes: r.cancellation_notice_minutes as number,
    loyaltyEnabled: r.loyalty_enabled as boolean,
    loyaltyStampsRequired: r.loyalty_stamps_required as number,
    loyaltyRewardText: (r.loyalty_reward_text as string) ?? null,
    loyaltyRewardConfirmed: r.loyalty_reward_confirmed as boolean,
    loyaltyAutoStampOnComplete: r.loyalty_auto_stamp_on_complete as boolean,
    loyaltyPhysicalMode: r.loyalty_physical_mode as "manual_migration" | "separate",
    scheduling: {
      bookingEnabled: r.booking_enabled as boolean,
      bookingStartDate: r.booking_start_date as string,
      slotIntervalMinutes: r.slot_interval_minutes as number,
      minNoticeMinutes: r.min_notice_minutes as number,
      maxAdvanceDays: r.max_advance_days as number,
      timezone: r.timezone as string,
    },
  };
}

export async function getSettings(db: Queryable): Promise<BusinessSettings> {
  const rows = await db.query("select * from business_settings where id = 1");
  if (!rows[0]) throw new Error("business_settings row missing — run the seed script.");
  return mapSettings(rows[0]);
}

export function fullAddress(s: Pick<BusinessSettings, "street" | "postalCode" | "city">) {
  return `${s.street}, ${s.postalCode} ${s.city}`;
}
