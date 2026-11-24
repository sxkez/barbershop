import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { getDb } from "@/lib/db";
import { searchAccounts } from "@/lib/loyalty/service";
import { getSettings } from "@/lib/settings";
import { Flash, PageHeader, Panel } from "@/components/admin/ui";
import { createMemberAction } from "../../actions/loyalty";

export const metadata: Metadata = { title: "Kundenclub" };

type Props = { searchParams: Promise<{ q?: string; ok?: string; error?: string }> };

export default async function AdminLoyalty({ searchParams }: Props) {
  const sp = await searchParams;
  const db = await getDb();
  const [accounts, settings] = await Promise.all([searchAccounts(db, sp.q ?? "", 50), getSettings(db)]);
  return (
    <>
      <PageHeader title="Kundenclub" description={`Belohnung ab ${settings.loyaltyStampsRequired} Stempeln. Stempel können nur hier im Admin vergeben werden.`} />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Kunden suchen">
          <form className="flex gap-2" action="/admin/kundenclub">
            <label htmlFor="q" className="sr-only">
              Name, E-Mail, Telefon oder Kartencode
            </label>
            <input id="q" name="q" defaultValue={sp.q ?? ""} className="field" placeholder="Name, E-Mail, Telefon oder Kartencode (HC-…)" autoFocus />
            <button className="btn btn-primary">
              <Search className="size-4" aria-hidden /> Suchen
            </button>
          </form>
          <ul className="mt-5 divide-y divide-line">
            {accounts.length === 0 && <li className="py-3 text-sm text-muted">Keine Treffer.</li>}
            {accounts.map((a) => (
              <li key={a.id}>
                <Link href={`/admin/kundenclub/${a.id}`} className="flex items-center gap-4 py-3 hover:bg-white/[0.02]">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{a.fullName}</span>
                    <span className="block truncate text-xs text-muted">
                      {a.email} · {a.cardCode}
                    </span>
                  </span>
                  <span className={`font-bold tabular-nums ${a.stamps >= settings.loyaltyStampsRequired ? "text-gold" : ""}`}>
                    {a.stamps}/{settings.loyaltyStampsRequired}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Neue Kundenkarte">
          <form action={createMemberAction} className="grid gap-3">
            <div>
              <label htmlFor="fullName" className="label">
                Name
              </label>
              <input id="fullName" name="fullName" required className="field" />
            </div>
            <div>
              <label htmlFor="email" className="label">
                E-Mail
              </label>
              <input id="email" name="email" type="email" required className="field" />
            </div>
            <div>
              <label htmlFor="phone" className="label">
                Telefon
              </label>
              <input id="phone" name="phone" type="tel" required className="field" />
            </div>
            <p className="text-xs text-muted">Bitte nur mit Einverständnis des Kunden anlegen. Existiert die E-Mail bereits, wird die vorhandene Karte geöffnet.</p>
            <div>
              <button className="btn btn-primary btn-sm">Karte anlegen</button>
            </div>
          </form>
        </Panel>
      </div>
    </>
  );
}
