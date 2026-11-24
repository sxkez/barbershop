import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { Field, Flash, PageHeader, Panel, Toggle } from "@/components/admin/ui";
import { saveSettingsAction } from "../../actions/settings";

export const metadata: Metadata = { title: "Einstellungen" };

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

export default async function SettingsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const s = await getSettings(await getDb());
  const hours = s.walkInHours.map((h) => `${h.days} | ${h.hours}`).join("\n");
  const social = s.socialLinks.map((l) => `${l.network} | ${l.label} | ${l.url ?? ""}`).join("\n");
  return (
    <>
      <PageHeader title="Einstellungen" description="Kontaktdaten, Öffnungszeiten, Buchungsregeln und Kundenclub." />
      <Flash ok={sp.ok} error={sp.error} />
      <form action={saveSettingsAction} className="grid max-w-5xl gap-6 lg:grid-cols-2">
        <Panel title="Geschäft & Kontakt">
          <div className="grid gap-4">
            <Field label="Name" name="name">
              <input id="name" name="name" defaultValue={s.name} className="field" />
            </Field>
            <Field label="Straße" name="street">
              <input id="street" name="street" defaultValue={s.street} className="field" />
            </Field>
            <div className="grid grid-cols-[110px_1fr] gap-3">
              <Field label="PLZ" name="postalCode">
                <input id="postalCode" name="postalCode" defaultValue={s.postalCode} className="field" />
              </Field>
              <Field label="Ort" name="city">
                <input id="city" name="city" defaultValue={s.city} className="field" />
              </Field>
            </div>
            <Field label="Telefon" name="phone">
              <input id="phone" name="phone" defaultValue={s.phone} className="field" />
            </Field>
            <Field label="E-Mail (öffentlich, Impressum)" name="email">
              <input id="email" name="email" type="email" defaultValue={s.email ?? ""} className="field" />
            </Field>
            <Field label="Google-Maps-Link" name="mapsUrl">
              <input id="mapsUrl" name="mapsUrl" defaultValue={s.mapsUrl ?? ""} className="field" />
            </Field>
            <Field label="Google-Bewertungslink" name="googleReviewUrl" hint="Wird erst angezeigt, wenn eingetragen.">
              <input id="googleReviewUrl" name="googleReviewUrl" defaultValue={s.googleReviewUrl ?? ""} className="field" />
            </Field>
            <Field label="Social Media" name="socialLinks" hint="Eine Zeile pro Netzwerk: netzwerk | Anzeigename | https://… (Link optional)">
              <textarea id="socialLinks" name="socialLinks" defaultValue={social} className="field min-h-20 font-mono text-sm" />
            </Field>
          </div>
        </Panel>

        <Panel title="Öffnungszeiten (ohne Termin)">
          <div className="grid gap-4">
            <Field label="Zeiten" name="walkInHours" hint="Eine Zeile pro Eintrag: Tage | Uhrzeit">
              <textarea id="walkInHours" name="walkInHours" defaultValue={hours} className="field min-h-24 font-mono text-sm" />
            </Field>
            <Field label="Hinweis" name="walkInNote">
              <textarea id="walkInNote" name="walkInNote" defaultValue={s.walkInNote ?? ""} className="field min-h-20" />
            </Field>
            <Toggle name="walkInConfirmed" label="Öffnungszeiten vom Inhaber bestätigt" defaultChecked={s.walkInConfirmed} />
          </div>
        </Panel>

        <Panel title="Online-Buchung">
          <div className="grid gap-4">
            <Toggle name="bookingEnabled" label="Online-Buchung aktiv" defaultChecked={s.scheduling.bookingEnabled} />
            <Field label="Frühester Buchungstag" name="bookingStartDate">
              <input id="bookingStartDate" type="date" name="bookingStartDate" defaultValue={s.scheduling.bookingStartDate} className="field" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Zeitraster (Min.)" name="slotInterval">
                <input id="slotInterval" type="number" name="slotInterval" min={5} max={120} step={5} defaultValue={s.scheduling.slotIntervalMinutes} className="field" />
              </Field>
              <Field label="Vorlauf (Std.)" name="minNoticeHours" hint="Mindestzeit vor Termin">
                <input id="minNoticeHours" type="number" name="minNoticeHours" min={0} max={168} defaultValue={Math.round(s.scheduling.minNoticeMinutes / 60)} className="field" />
              </Field>
              <Field label="Buchbar für (Tage)" name="maxAdvanceDays">
                <input id="maxAdvanceDays" type="number" name="maxAdvanceDays" min={1} max={730} defaultValue={s.scheduling.maxAdvanceDays} className="field" />
              </Field>
              <Field label="Stornofrist (Std.)" name="cancellationHours" hint="Online-Storno bis …">
                <input id="cancellationHours" type="number" name="cancellationHours" min={0} max={168} defaultValue={Math.round(s.cancellationNoticeMinutes / 60)} className="field" />
              </Field>
            </div>
            <p className="text-xs text-muted">Wochentage & Uhrzeiten unter „Verfügbarkeit“. Zeitzone: {s.timezone}.</p>
          </div>
        </Panel>

        <Panel title="Kundenclub">
          <div className="grid gap-4">
            <Toggle name="loyaltyEnabled" label="Kundenclub aktiv" defaultChecked={s.loyaltyEnabled} />
            <Field label="Stempel bis zur Belohnung" name="stampsRequired">
              <input id="stampsRequired" type="number" name="stampsRequired" min={1} max={50} defaultValue={s.loyaltyStampsRequired} className="field max-w-28" />
            </Field>
            <Field label="Belohnung (öffentlich sichtbar)" name="rewardText">
              <input id="rewardText" name="rewardText" defaultValue={s.loyaltyRewardText ?? ""} className="field" />
            </Field>
            <Toggle name="rewardConfirmed" label="Belohnung vom Inhaber bestätigt" defaultChecked={s.loyaltyRewardConfirmed} />
            <Toggle
              name="autoStamp"
              label="Automatisch stempeln, wenn ein Termin als „erledigt“ markiert wird"
              defaultChecked={s.loyaltyAutoStampOnComplete}
              hint="Standard: aus. Nur für Kunden mit digitaler Karte, höchstens ein Stempel pro Termin."
            />
            <Field label="Papier-Stempelkarten" name="physicalMode">
              <select id="physicalMode" name="physicalMode" defaultValue={s.loyaltyPhysicalMode} className="field">
                <option value="manual_migration">Können manuell auf die digitale Karte übertragen werden</option>
                <option value="separate">Bleiben getrennt (kein Übertrag)</option>
              </select>
            </Field>
          </div>
        </Panel>

        <Panel title="E-Mail">
          <div className="grid gap-4">
            <Field label="Absender" name="emailFrom" hint='z. B. "HANI BARBERSHOP <termine@ihre-domain.de>" – Domain muss bei Resend verifiziert sein. EMAIL_FROM in der Umgebung hat Vorrang.'>
              <input id="emailFrom" name="emailFrom" defaultValue={s.emailFrom ?? ""} className="field" />
            </Field>
            <Field label="Antwort an (Reply-To)" name="emailReplyTo">
              <input id="emailReplyTo" name="emailReplyTo" type="email" defaultValue={s.emailReplyTo ?? ""} className="field" />
            </Field>
          </div>
        </Panel>

        <div className="lg:col-span-2">
          <button className="btn btn-primary">Einstellungen speichern</button>
        </div>
      </form>
    </>
  );
}
