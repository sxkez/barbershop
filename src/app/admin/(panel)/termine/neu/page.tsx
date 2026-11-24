import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { listServices } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { todayLocal } from "@/lib/time";
import { Field, Flash, PageHeader, Panel } from "@/components/admin/ui";
import { createManualBookingAction } from "../../../actions/bookings";

export const metadata: Metadata = { title: "Termin anlegen" };

type Props = { searchParams: Promise<{ ok?: string; error?: string; date?: string }> };

export default async function NewBookingPage({ searchParams }: Props) {
  const sp = await searchParams;
  const db = await getDb();
  const [services, settings] = await Promise.all([listServices(db), getSettings(db)]);
  return (
    <>
      <PageHeader title="Termin anlegen" description="Manuelle Buchung, z. B. telefonisch. Überschneidungen werden verhindert, Öffnungszeiten werden hier nicht erzwungen." />
      <Flash ok={sp.ok} error={sp.error} />
      <Panel className="max-w-2xl">
        <form action={createManualBookingAction} className="grid gap-4">
          <input type="hidden" name="idempotencyKey" value={randomUUID()} />
          <Field label="Leistung" name="serviceId">
            <select id="serviceId" name="serviceId" className="field" required defaultValue="">
              <option value="" disabled>
                Bitte wählen
              </option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.durationMinutes} Min.)
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Datum" name="date">
              <input id="date" type="date" name="date" required className="field" defaultValue={sp.date ?? todayLocal(new Date(), settings.timezone)} />
            </Field>
            <Field label="Uhrzeit" name="time">
              <input id="time" type="time" name="time" step={300} required className="field" defaultValue="10:00" />
            </Field>
          </div>
          <Field label="Name" name="fullName">
            <input id="fullName" name="fullName" required className="field" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Telefon" name="phone">
              <input id="phone" name="phone" type="tel" required className="field" />
            </Field>
            <Field label="E-Mail" name="email">
              <input id="email" name="email" type="email" required className="field" />
            </Field>
          </div>
          <Field label="Notiz (optional)" name="notes">
            <textarea id="notes" name="notes" className="field min-h-20" maxLength={500} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="notify" defaultChecked className="size-4 accent-blue" /> Bestätigung per E-Mail senden
          </label>
          <div>
            <button className="btn btn-primary">Termin anlegen</button>
          </div>
        </form>
      </Panel>
    </>
  );
}
