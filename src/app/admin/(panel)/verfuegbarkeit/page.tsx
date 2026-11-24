import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDateShort, todayLocal } from "@/lib/time";
import { Flash, PageHeader, Panel } from "@/components/admin/ui";
import { addExceptionAction, deleteExceptionAction, saveAvailabilityRulesAction } from "../../actions/catalog";

export const metadata: Metadata = { title: "Verfügbarkeit" };

const DAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const KIND = { closed: "Geschlossen", break: "Pause / blockiert", extra_open: "Zusätzlich geöffnet" } as const;

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

export default async function AvailabilityPage({ searchParams }: Props) {
  const sp = await searchParams;
  const db = await getDb();
  const settings = await getSettings(db);
  const today = todayLocal(new Date(), settings.timezone);
  const rules = await db.query<{ weekday: number; start: string; end: string; valid_from: string | null }>(
    "select weekday, to_char(start_time,'HH24:MI') as start, to_char(end_time,'HH24:MI') as end, valid_from from availability_rules where barber_id is null order by weekday, start_time",
  );
  const exceptions = await db.query<{ id: string; date: string; kind: keyof typeof KIND; start: string | null; end: string | null; reason: string | null }>(
    "select id, date, kind, to_char(start_time,'HH24:MI') as start, to_char(end_time,'HH24:MI') as end, reason from availability_exceptions where date >= $1 order by date, start_time nulls first",
    [today],
  );
  const byDay = (wd: number) => rules.filter((r) => r.weekday === wd);
  const validFrom = rules[0]?.valid_from ?? settings.scheduling.bookingStartDate;

  return (
    <>
      <PageHeader title="Verfügbarkeit" description="Online-Buchungszeiten, Pausen, Feiertage und Schließtage." />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Wöchentliche Buchungszeiten (online)">
          <form action={saveAvailabilityRulesAction} className="space-y-4">
            <p className="text-xs text-muted">Leer lassen = an diesem Tag keine Online-Termine. Bis zu drei Zeitfenster pro Tag (z. B. für eine Mittagspause).</p>
            <div className="space-y-3">
              {DAYS.map((name, idx) => {
                const wd = idx + 1;
                const list = byDay(wd);
                return (
                  <fieldset key={wd} className="grid grid-cols-[90px_1fr] items-start gap-3">
                    <legend className="sr-only">{name}</legend>
                    <span className="pt-2 text-sm font-medium">{name}</span>
                    <div className="space-y-2">
                      {[0, 1, 2].slice(0, list.length === 0 ? 1 : Math.min(3, list.length + 1)).map((i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input aria-label={`${name} Fenster ${i + 1} von`} type="time" step={300} name={`r${wd}_${i}_start`} defaultValue={list[i]?.start ?? ""} className="field min-h-10 py-1.5" />
                          <span className="text-muted">–</span>
                          <input aria-label={`${name} Fenster ${i + 1} bis`} type="time" step={300} name={`r${wd}_${i}_end`} defaultValue={list[i]?.end ?? ""} className="field min-h-10 py-1.5" />
                        </div>
                      ))}
                    </div>
                  </fieldset>
                );
              })}
            </div>
            <div>
              <label htmlFor="validFrom" className="label">
                Gültig ab
              </label>
              <input id="validFrom" type="date" name="validFrom" defaultValue={validFrom} className="field max-w-xs" />
            </div>
            <button className="btn btn-primary btn-sm">Speichern</button>
          </form>
        </Panel>

        <div className="space-y-6">
          <Panel title="Ausnahme hinzufügen">
            <form action={addExceptionAction} className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="ex-date" className="label">
                  Von
                </label>
                <input id="ex-date" type="date" name="date" required className="field" defaultValue={today} />
              </div>
              <div>
                <label htmlFor="ex-to" className="label">
                  Bis (optional)
                </label>
                <input id="ex-to" type="date" name="dateTo" className="field" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ex-kind" className="label">
                  Art
                </label>
                <select id="ex-kind" name="kind" className="field">
                  <option value="closed">Geschlossen (Urlaub, Feiertag)</option>
                  <option value="break">Pause / Zeit blockieren</option>
                  <option value="extra_open">Zusätzlich geöffnet</option>
                </select>
              </div>
              <div>
                <label htmlFor="ex-start" className="label">
                  Von Uhrzeit
                </label>
                <input id="ex-start" type="time" step={300} name="start" className="field" />
              </div>
              <div>
                <label htmlFor="ex-end" className="label">
                  Bis Uhrzeit
                </label>
                <input id="ex-end" type="time" step={300} name="end" className="field" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ex-reason" className="label">
                  Grund (optional)
                </label>
                <input id="ex-reason" name="reason" className="field" placeholder="z. B. Neujahr" />
              </div>
              <p className="text-xs text-muted sm:col-span-2">Ohne Uhrzeit wird bei „Geschlossen“ der ganze Tag gesperrt. Bereits gebuchte Termine bleiben bestehen.</p>
              <div>
                <button className="btn btn-primary btn-sm">Hinzufügen</button>
              </div>
            </form>
          </Panel>
          <Panel title="Kommende Ausnahmen">
            {exceptions.length === 0 ? (
              <p className="text-sm text-muted">Keine.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {exceptions.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-2.5">
                    <span className="w-24 font-medium">{formatDateShort(e.date)}</span>
                    <span className="flex-1">
                      {KIND[e.kind]}
                      {e.start && ` · ${e.start}–${e.end}`}
                      {e.reason && <span className="text-muted"> · {e.reason}</span>}
                    </span>
                    <form action={deleteExceptionAction}>
                      <input type="hidden" name="id" value={e.id} />
                      <button className="btn btn-ghost btn-sm" aria-label="Ausnahme löschen">
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
