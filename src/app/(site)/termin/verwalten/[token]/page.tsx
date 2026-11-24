import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { canCustomerChange, getBookingByToken } from "@/lib/booking/service";
import { getSettings, fullAddress } from "@/lib/settings";
import { formatDateLong } from "@/lib/time";
import { formatPrice, telHref } from "@/lib/format";
import { ManageBooking } from "@/components/booking/ManageBooking";

export const metadata: Metadata = { title: "Termin verwalten", robots: { index: false, follow: false } };

type Props = { params: Promise<{ token: string }> };

const STATUS_LABEL = { confirmed: "Bestätigt", cancelled: "Storniert", completed: "Abgeschlossen", no_show: "Nicht erschienen" } as const;

export default async function ManagePage({ params }: Props) {
  const { token } = await params;
  const db = await getDb();
  const now = new Date();
  const [booking, settings] = await Promise.all([getBookingByToken(db, token, now), getSettings(db)]);

  if (!booking) {
    return (
      <div className="container-page max-w-xl pt-16 text-center">
        <h1 className="display text-3xl">Link ungültig oder abgelaufen</h1>
        <p className="mt-4 text-muted">
          Dieser Verwaltungslink ist nicht (mehr) gültig. Bei Fragen zu deinem Termin ruf uns bitte an:{" "}
          <a href={telHref(settings.phone)} className="text-fg">
            {settings.phone}
          </a>
        </p>
        <Link href="/termin" className="btn btn-primary mt-8">
          Neuen Termin buchen
        </Link>
      </div>
    );
  }

  const changeable = canCustomerChange(booking, settings, now);
  return (
    <div className="container-page max-w-2xl pt-12 md:pt-16">
      <p className="eyebrow">Dein Termin</p>
      <h1 className="display mt-3 text-3xl md:text-4xl">Termin verwalten</h1>
      <div className="brand-rule mt-5 w-28" aria-hidden />
      <dl className="card mt-8 divide-y divide-line">
        {[
          ["Status", STATUS_LABEL[booking.status]],
          ["Buchungsnummer", booking.reference],
          ["Leistung", booking.serviceName],
          ["Datum", formatDateLong(booking.localDate)],
          ["Uhrzeit", `${booking.localTime} Uhr`],
          ["Dauer", `ca. ${booking.durationMinutes} Minuten`],
          ...(booking.priceCents != null ? [["Preis", formatPrice(booking.priceCents)]] : []),
          ["Ort", fullAddress(settings)],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:justify-between">
            <dt className="text-sm text-muted">{k}</dt>
            <dd className="font-semibold sm:text-right">{v}</dd>
          </div>
        ))}
      </dl>
      {booking.status === "confirmed" &&
        (changeable ? (
          <ManageBooking token={token} serviceId={booking.serviceId} startMonth={booking.localDate.slice(0, 7)} />
        ) : (
          <p className="mt-8 rounded-xl border border-line p-5 text-sm text-muted">
            Änderungen sind online nur bis {Math.round(settings.cancellationNoticeMinutes / 60)} Stunden vor dem Termin möglich. Bitte ruf uns an:{" "}
            <a className="text-fg" href={telHref(settings.phone)}>
              {settings.phone}
            </a>
          </p>
        ))}
      {booking.status === "confirmed" && (
        <a href={`/api/bookings/ics?token=${encodeURIComponent(token)}`} className="btn btn-ghost mt-4 w-full sm:w-auto">
          Zum Kalender hinzufügen
        </a>
      )}
    </div>
  );
}
