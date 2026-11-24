import type { Metadata } from "next";
import Image from "next/image";
import { Gift, QrCode, ShieldCheck, Stamp } from "lucide-react";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { SectionHeading } from "@/components/site/ui";
import { DigitalCard } from "@/components/site/DigitalCard";
import { CardLinkForm } from "@/components/site/CardLinkForm";
import stempelkarte from "../../../../public/images/merch/stempelkarte.webp";

export const metadata: Metadata = {
  title: "Kundenclub & Stempelkarte",
  description: "Sammle Stempel bei HANI BARBERSHOP in Landau – auf der Papier-Stempelkarte oder digital auf dem Handy.",
  alternates: { canonical: "/kundenclub" },
};

export default async function KundenclubPage() {
  const settings = await getSettings(await getDb());
  const n = settings.loyaltyStampsRequired;
  return (
    <div className="container-page pt-14 md:pt-20">
      <SectionHeading
        as="h1"
        eyebrow="Kundenclub"
        title="Stempeln & sparen"
        intro={`Sammle ${n} Stempel und erhalte deine Belohnung – ganz klassisch auf Papier oder digital auf dem Handy.`}
      />

      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div className="relative mx-auto w-full max-w-lg">
          <Image src={stempelkarte} alt="HANI Stempelkarte aus Papier mit 10 Stempelfeldern" placeholder="blur" className="w-full rounded-2xl shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)]" sizes="(min-width:1024px) 40vw, 100vw" />
          <p className="mt-3 text-center text-xs text-muted">Die klassische Stempelkarte – gibt es an der Theke.</p>
        </div>
        <div className="mx-auto w-full max-w-md">
          <DigitalCard stamps={4} required={n} name="Dein Name" preview />
          <p className="mt-3 text-center text-xs text-muted">So sieht deine digitale Karte aus (Beispiel).</p>
        </div>
      </div>

      <ul className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Stamp, t: "Stempel im Shop", d: "Stempel vergibt nur das HANI-Team an der Theke." },
          { icon: QrCode, t: "QR-Code", d: "Zeig deine digitale Karte vor, wir scannen und stempeln in Sekunden." },
          { icon: Gift, t: `${n} Stempel = Belohnung`, d: settings.loyaltyRewardText ?? "Die Belohnung erfährst du im Shop." },
          { icon: ShieldCheck, t: "Freiwillig", d: "Für Termine brauchst du keinen Kundenclub. Du kannst deine Karte jederzeit löschen lassen." },
        ].map(({ icon: Icon, t, d }) => (
          <li key={t} className="card p-6">
            <Icon className="size-7 text-gold" strokeWidth={1.6} aria-hidden />
            <p className="mt-4 font-bold">{t}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{d}</p>
          </li>
        ))}
      </ul>

      <section className="mt-16 grid gap-8 lg:grid-cols-2" aria-labelledby="join">
        <div className="card p-6 md:p-8">
          <h2 id="join" className="display text-2xl">
            So machst du mit
          </h2>
          <ol className="mt-5 space-y-4 text-sm leading-relaxed text-fg/85">
            <li>
              <strong className="text-fg">1. Karte anlegen:</strong> beim nächsten Besuch an der Theke – oder bei der Online-Buchung das Häkchen „Digitale Stempelkarte
              anlegen“ setzen.
            </li>
            <li>
              <strong className="text-fg">2. Papierkarte übertragen:</strong> Du hast schon Stempel auf Papier? Wir können sie auf deine digitale Karte übertragen.
            </li>
            <li>
              <strong className="text-fg">3. Karte öffnen:</strong> Gib rechts deine E-Mail-Adresse ein, wir schicken dir einen Link zu deiner Karte.
            </li>
          </ol>
        </div>
        <div className="card p-6 md:p-8">
          <h2 className="display text-2xl">Meine Karte öffnen</h2>
          <p className="mt-3 text-sm text-muted">Wir senden dir einen 7 Tage gültigen Link an die E-Mail-Adresse, mit der deine Karte angelegt wurde.</p>
          <CardLinkForm />
        </div>
      </section>
    </div>
  );
}
