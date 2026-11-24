import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Info } from "lucide-react";
import { getDb } from "@/lib/db";
import { listServices } from "@/lib/catalog";
import { InfoBanner, PackageCard, SectionHeading, ServiceRow } from "@/components/site/ui";
import { Reveal } from "@/components/site/Reveal";

export const metadata: Metadata = {
  title: "Leistungen & Preise",
  description: "Haarschnitt, Kinderhaarschnitt, Bartrasur, Augenbrauen und Wachs-Behandlungen bei HANI BARBERSHOP in Landau an der Isar.",
  alternates: { canonical: "/leistungen" },
};

export default async function LeistungenPage() {
  const services = await listServices(await getDb());
  const packages = services.filter((s) => s.isPackage);
  const singles = services.filter((s) => !s.isPackage);
  const groups = new Map<string, typeof singles>();
  for (const s of singles) {
    const key = s.categoryName ?? "Weitere Leistungen";
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  const anyUnpublished = services.some((s) => !s.pricePublished);

  return (
    <div className="container-page pt-14 md:pt-20">
      <SectionHeading as="h1" eyebrow="HANI Barbershop" title="Leistungen" intro="Vom klassischen Haarschnitt bis zum Rundum-Paket mit Bart und Augenbrauen." />

      {packages.length > 0 && (
        <section aria-labelledby="pakete-h" className="mb-20">
          <h2 id="pakete-h" className="sr-only">
            Pakete
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            {packages.map((s, i) => (
              <Reveal key={s.id} delay={i * 0.06}>
                <PackageCard service={s} index={i} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {[...groups.entries()].map(([name, list]) => (
          <Reveal key={name}>
            <section className="card h-full p-6 md:p-8" aria-labelledby={`g-${name}`}>
              <h2 id={`g-${name}`} className="display text-xl">
                {name}
              </h2>
              <div className="brand-rule mt-3 w-16" aria-hidden />
              <ul className="mt-4">
                {list.map((s) => (
                  <ServiceRow key={s.id} service={s} />
                ))}
              </ul>
            </section>
          </Reveal>
        ))}
      </div>

      {anyUnpublished && (
        <p className="mt-6 flex items-start gap-2 text-sm text-muted">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Für Leistungen mit „Preis auf Anfrage“ nennen wir dir den aktuellen Preis gern telefonisch oder vor Ort.
        </p>
      )}

      <div className="mt-16">
        <InfoBanner />
      </div>
      <div className="mt-10 flex justify-center">
        <Link href="/termin" className="btn btn-primary">
          <CalendarDays className="size-5" aria-hidden /> Termin buchen
        </Link>
      </div>
    </div>
  );
}
