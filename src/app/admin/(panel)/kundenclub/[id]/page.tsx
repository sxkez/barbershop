import type { Metadata } from "next";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { ArrowLeft, Gift, Stamp } from "lucide-react";
import { getDb } from "@/lib/db";
import { getAccount, getTransactions } from "@/lib/loyalty/service";
import { getSettings } from "@/lib/settings";
import { formatInstant } from "@/lib/time";
import { DigitalCard } from "@/components/site/DigitalCard";
import { Flash, PageHeader, Panel } from "@/components/admin/ui";
import { loyaltyAction } from "../../../actions/loyalty";

export const metadata: Metadata = { title: "Kundenkarte" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

const TYPE = { stamp: "Stempel", correction: "Korrektur", redemption: "Einlösung", migration: "Übertrag Papier" } as const;

function Op({ accountId, op, children }: { accountId: string; op: string; children: React.ReactNode }) {
  return (
    <form action={loyaltyAction} className="contents">
      <input type="hidden" name="accountId" value={accountId} />
      <input type="hidden" name="op" value={op} />
      {/* fresh key per page render → a double click submits the same key and is ignored */}
      <input type="hidden" name="idempotencyKey" value={randomUUID()} />
      {children}
    </form>
  );
}

export default async function AccountPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await getDb();
  const [account, settings] = await Promise.all([getAccount(db, id), getSettings(db)]);
  if (!account) notFound();
  const history = await getTransactions(db, id, 100);
  const req = settings.loyaltyStampsRequired;

  return (
    <>
      <Link href="/admin/kundenclub" className="mb-4 inline-flex items-center gap-2 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Kundenclub
      </Link>
      <PageHeader title={account.fullName} description={`${account.email} · ${account.phone}`} />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <DigitalCard stamps={account.stamps} required={req} name={account.fullName} cardCode={account.cardCode} />
          <Panel title="Aktionen">
            <div className="flex flex-wrap gap-2">
              <Op accountId={id} op="stamp">
                <button className="btn btn-primary">
                  <Stamp className="size-5" aria-hidden /> +1 Stempel
                </button>
              </Op>
              <Op accountId={id} op="redeem">
                <button className="btn btn-ghost border-gold/60" disabled={account.stamps < req}>
                  <Gift className="size-5 text-gold" aria-hidden /> Belohnung einlösen (−{req})
                </button>
              </Op>
            </div>
            {settings.loyaltyRewardText && <p className="mt-3 text-xs text-muted">Belohnung: {settings.loyaltyRewardText}</p>}
          </Panel>
          {settings.loyaltyPhysicalMode === "manual_migration" && (
            <Panel title="Stempel von der Papierkarte übertragen">
              <Op accountId={id} op="migrate">
                <div className="grid gap-3">
                  <div className="flex gap-2">
                    <label htmlFor="mig-count" className="sr-only">
                      Anzahl
                    </label>
                    <input id="mig-count" name="count" type="number" min={1} max={50} required className="field max-w-28" placeholder="Anzahl" />
                    <input name="reason" className="field" placeholder="Notiz (optional)" aria-label="Notiz" />
                  </div>
                  <div>
                    <button className="btn btn-ghost btn-sm">Übertragen</button>
                  </div>
                  <p className="text-xs text-muted">Danach die Papierkarte entwerten, damit Stempel nicht doppelt zählen.</p>
                </div>
              </Op>
            </Panel>
          )}
          <Panel title="Korrektur (mit Begründung)">
            <Op accountId={id} op="correct">
              <div className="grid gap-3">
                <div className="flex gap-2">
                  <label htmlFor="delta" className="sr-only">
                    Änderung
                  </label>
                  <input id="delta" name="delta" type="number" min={-50} max={50} required className="field max-w-28" placeholder="±" />
                  <input name="reason" required className="field" placeholder="Begründung (Pflicht)" aria-label="Begründung" />
                </div>
                <div>
                  <button className="btn btn-ghost btn-sm">Korrigieren</button>
                </div>
              </div>
            </Op>
          </Panel>
        </div>
        <Panel title="Verlauf">
          {history.length === 0 ? (
            <p className="text-sm text-muted">Noch keine Buchungen.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="pb-2 font-medium">Datum</th>
                  <th className="pb-2 font-medium">Art</th>
                  <th className="pb-2 text-right font-medium">±</th>
                  <th className="pb-2 text-right font-medium">Stand</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {history.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2 pr-3 text-xs text-muted">{formatInstant(t.createdAt)}</td>
                    <td className="py-2 pr-3">
                      {TYPE[t.type]}
                      {t.reason && <span className="block text-xs text-muted">{t.reason}</span>}
                    </td>
                    <td className={`py-2 text-right font-semibold ${t.delta > 0 ? "text-blue-soft" : "text-red"}`}>{t.delta > 0 ? `+${t.delta}` : t.delta}</td>
                    <td className="py-2 text-right tabular-nums">{t.balanceAfter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </>
  );
}
