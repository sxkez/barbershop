import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { LegalDraftNotice } from "@/components/site/LegalDraftNotice";

export const metadata: Metadata = { title: "Datenschutzerklärung", alternates: { canonical: "/datenschutz" } };

/*
 * Placeholder structure describing what this website actually processes.
 * It is NOT a finished privacy policy and does not claim GDPR compliance.
 */
export default async function DatenschutzPage() {
  const s = await getSettings(await getDb());
  const sections: [string, string][] = [
    [
      "1. Verantwortlicher",
      `${s.name}, [Inhaber], ${s.street}, ${s.postalCode} ${s.city}, Telefon ${s.phone}, E-Mail ${s.email ?? "[ergänzen]"}.`,
    ],
    [
      "2. Online-Terminbuchung",
      "Für die Buchung verarbeiten wir Name, Telefonnummer, E-Mail-Adresse, gewählte Leistung, Datum/Uhrzeit und optionale Anmerkungen, um den Termin durchzuführen und dich zu informieren (Art. 6 Abs. 1 lit. b DSGVO). [Speicherdauer vom Inhaber festzulegen.]",
    ],
    [
      "3. E-Mail-Versand",
      "Bestätigungs- und Änderungs-E-Mails werden über einen E-Mail-Dienstleister versendet. [Anbieter, Sitz und Auftragsverarbeitungsvertrag ergänzen.]",
    ],
    [
      "4. Kundenclub (freiwillig)",
      "Wenn du eine digitale Stempelkarte anlegst, speichern wir Name, E-Mail, Telefonnummer, Stempelstand und Stempelverlauf. Die Teilnahme ist freiwillig; du kannst die Löschung jederzeit verlangen.",
    ],
    [
      "5. Hosting & Datenbank",
      "Die Website wird bei [Hosting-Anbieter, z. B. Vercel] betrieben, die Daten werden in einer Datenbank bei [Supabase, Region] gespeichert. [Angaben prüfen und ergänzen.]",
    ],
    [
      "6. Server-Logs & Sicherheit",
      "Zum Schutz vor Missbrauch (z. B. Spam-Buchungen) verarbeiten wir die IP-Adresse kurzzeitig in gekürzter/gehashter Form für eine Begrenzung von Anfragen.",
    ],
    ["7. Cookies", "Die öffentliche Website setzt keine Tracking-Cookies. Im Admin-Bereich werden technisch notwendige Sitzungs-Cookies verwendet."],
    [
      "8. Deine Rechte",
      "Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch sowie Beschwerde bei einer Aufsichtsbehörde (Art. 15–21, 77 DSGVO). [Zuständige Aufsichtsbehörde ergänzen.]",
    ],
  ];
  return (
    <article className="container-page max-w-3xl pt-14 md:pt-20">
      <h1 className="display text-4xl">Datenschutz</h1>
      <LegalDraftNotice />
      <div className="mt-8 space-y-7 leading-relaxed text-fg/85">
        {sections.map(([h, t]) => (
          <section key={h}>
            <h2 className="text-lg font-bold text-fg">{h}</h2>
            <p className="mt-2">{t}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
