import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { LegalDraftNotice } from "@/components/site/LegalDraftNotice";

export const metadata: Metadata = { title: "Impressum", robots: { index: true, follow: true }, alternates: { canonical: "/impressum" } };

export default async function ImpressumPage() {
  const s = await getSettings(await getDb());
  return (
    <article className="container-page max-w-3xl pt-14 md:pt-20">
      <h1 className="display text-4xl">Impressum</h1>
      <LegalDraftNotice />
      <div className="mt-8 space-y-6 leading-relaxed text-fg/85">
        <section>
          <h2 className="text-lg font-bold text-fg">Angaben gemäß § 5 DDG</h2>
          <p className="mt-2">
            {s.name}
            <br />
            [Vor- und Nachname des Inhabers]
            <br />
            {s.street}
            <br />
            {s.postalCode} {s.city}
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-fg">Kontakt</h2>
          <p className="mt-2">
            Telefon: {s.phone}
            <br />
            E-Mail: {s.email ?? "[E-Mail-Adresse ergänzen]"}
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-fg">Umsatzsteuer-ID</h2>
          <p className="mt-2">[Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG, falls vorhanden]</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-fg">Berufsrechtliche Angaben</h2>
          <p className="mt-2">[Handwerkskammer, Eintragung in die Handwerksrolle, Berufsbezeichnung – vom Inhaber zu ergänzen]</p>
        </section>
      </div>
    </article>
  );
}
