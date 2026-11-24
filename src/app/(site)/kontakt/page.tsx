import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Clock, MapPin, Navigation, Phone, Star, Users } from "lucide-react";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { SectionHeading, InfoBanner } from "@/components/site/ui";
import { telHref } from "@/lib/format";

export const metadata: Metadata = {
  title: "Kontakt & Anfahrt",
  description: "HANI BARBERSHOP, Höckinger Str. 1, 94405 Landau an der Isar. Telefon, Öffnungszeiten und Anfahrt.",
  alternates: { canonical: "/kontakt" },
};

export default async function KontaktPage() {
  const s = await getSettings(await getDb());
  return (
    <div className="container-page pt-14 md:pt-20">
      <SectionHeading as="h1" eyebrow="So findest du uns" title="Kontakt" />
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card p-6 md:p-8" aria-labelledby="adresse">
          <MapPin className="size-7 text-blue" strokeWidth={1.6} aria-hidden />
          <h2 id="adresse" className="mt-4 text-lg font-bold">
            Adresse
          </h2>
          <address className="mt-2 not-italic leading-relaxed text-fg/85">
            {s.name}
            <br />
            {s.street}
            <br />
            {s.postalCode} {s.city}
          </address>
          {s.mapsUrl && (
            <a href={s.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-6 w-full">
              <Navigation className="size-5" aria-hidden /> Route planen
            </a>
          )}
        </section>
        <section className="card p-6 md:p-8" aria-labelledby="tel">
          <Phone className="size-7 text-blue" strokeWidth={1.6} aria-hidden />
          <h2 id="tel" className="mt-4 text-lg font-bold">
            Telefon
          </h2>
          <a href={telHref(s.phone)} className="mt-2 block text-2xl font-bold hover:text-blue-soft">
            {s.phone}
          </a>
          <p className="mt-2 text-sm text-muted">Telefonische Anfragen bitte nur während der Öffnungszeiten.</p>
          <Link href="/termin" className="btn btn-ghost mt-6 w-full">
            <CalendarDays className="size-5" aria-hidden /> Online-Termin buchen
          </Link>
        </section>
        <section className="card p-6 md:p-8" aria-labelledby="zeiten">
          <Clock className="size-7 text-blue" strokeWidth={1.6} aria-hidden />
          <h2 id="zeiten" className="mt-4 text-lg font-bold">
            Öffnungszeiten
          </h2>
          <ul className="mt-2 space-y-2">
            {s.walkInHours.map((h) => (
              <li key={h.days} className="flex justify-between gap-4">
                <span className="text-fg/85">{h.days}</span>
                <span className="text-muted">{h.hours}</span>
              </li>
            ))}
          </ul>
          {s.walkInNote && <p className="mt-4 text-sm leading-relaxed text-muted">{s.walkInNote}</p>}
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="card p-6 md:p-8" aria-labelledby="social">
          <Users className="size-7 text-blue" strokeWidth={1.6} aria-hidden />
          <h2 id="social" className="mt-4 text-lg font-bold">
            Social Media
          </h2>
          <ul className="mt-3 space-y-2">
            {s.socialLinks.map((l) => (
              <li key={l.network} className="flex items-center justify-between gap-4">
                <span className="capitalize text-muted">{l.network}</span>
                {l.url ? (
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-blue-soft">
                    {l.label}
                  </a>
                ) : (
                  <span className="font-semibold">{l.label}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
        {s.googleReviewUrl && (
          <section className="card p-6 md:p-8" aria-labelledby="review">
            <Star className="size-7 text-gold" strokeWidth={1.6} aria-hidden />
            <h2 id="review" className="mt-4 text-lg font-bold">
              Bewerte uns auf Google
            </h2>
            <p className="mt-2 text-sm text-muted">Deine Bewertung hilft uns und anderen Kunden.</p>
            <a href={s.googleReviewUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost mt-6">
              Bewertung schreiben
            </a>
          </section>
        )}
      </div>
      <div className="mt-16">
        <InfoBanner />
      </div>
    </div>
  );
}
