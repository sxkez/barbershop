import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { listServices } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { publicPrice } from "@/lib/format";
import { formatDateLong, todayLocal } from "@/lib/time";

export const metadata: Metadata = {
  title: "Termin buchen",
  description: "Online-Termin bei HANI BARBERSHOP in Landau an der Isar buchen – ab Januar 2027 montags und dienstags.",
  alternates: { canonical: "/termin" },
};

type Props = { searchParams: Promise<{ leistung?: string }> };

export default async function TerminPage({ searchParams }: Props) {
  const { leistung } = await searchParams;
  const db = await getDb();
  const [services, settings] = await Promise.all([listServices(db), getSettings(db)]);
  const bookable = services
    .filter((s) => s.onlineBookable)
    .map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      includes: s.includes ?? s.description,
      durationMinutes: s.durationMinutes,
      priceLabel: publicPrice(s),
      isPackage: s.isPackage,
    }));
  const today = todayLocal(new Date(), settings.timezone);
  const startMonth = (settings.scheduling.bookingStartDate > today ? settings.scheduling.bookingStartDate : today).slice(0, 7);

  return (
    <div className="container-page pt-10 md:pt-16">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">Online-Termin</p>
        <h1 className="display mt-3 text-4xl md:text-5xl">Termin buchen</h1>
        <div className="brand-rule mt-5 w-32" aria-hidden />
        <p className="mt-5 text-fg/80">
          Online-Termine gibt es ab {formatDateLong(settings.scheduling.bookingStartDate)} jeweils <strong>montags und dienstags</strong>. Mittwoch bis
          Samstag kommst du einfach ohne Termin vorbei.
        </p>
      </div>
      <div className="mx-auto mt-10 max-w-3xl">
        {settings.scheduling.bookingEnabled && bookable.length > 0 ? (
          <BookingWizard
            services={bookable}
            initialServiceSlug={leistung ?? null}
            startMonth={startMonth}
            phone={settings.phone}
            loyaltyEnabled={settings.loyaltyEnabled}
          />
        ) : (
          <div className="card p-8 text-center">
            <p className="font-semibold">Die Online-Buchung ist gerade nicht verfügbar.</p>
            <p className="mt-2 text-muted">Ruf uns gern an: {settings.phone}</p>
          </div>
        )}
      </div>
    </div>
  );
}
