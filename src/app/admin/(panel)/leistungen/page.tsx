import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { getDb } from "@/lib/db";
import { listServices } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { Flash, PageHeader } from "@/components/admin/ui";
import { archiveServiceAction, moveServiceAction } from "../../actions/catalog";

export const metadata: Metadata = { title: "Leistungen" };

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

export default async function AdminServices({ searchParams }: Props) {
  const sp = await searchParams;
  const services = await listServices(await getDb(), { includeInactive: true });
  return (
    <>
      <PageHeader
        title="Leistungen & Preise"
        description="Preise erscheinen erst öffentlich, wenn „Preis veröffentlichen“ aktiv ist – sonst „Preis auf Anfrage“."
        actions={
          <Link href="/admin/leistungen/neu" className="btn btn-primary btn-sm">
            <Plus className="size-4" aria-hidden /> Neue Leistung
          </Link>
        }
      />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted">
            <tr className="border-b border-line">
              <th className="w-20 px-3 py-3 font-medium">Reihenf.</th>
              <th className="px-3 py-3 font-medium">Leistung</th>
              <th className="px-3 py-3 font-medium">Preis</th>
              <th className="px-3 py-3 font-medium">Dauer</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {services.map((s) => (
              <tr key={s.id} className={s.archived ? "opacity-50" : ""}>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    {(["up", "down"] as const).map((dir) => (
                      <form key={dir} action={moveServiceAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="dir" value={dir} />
                        <button className="btn btn-ghost btn-sm size-8 p-0" aria-label={`${s.name} nach ${dir === "up" ? "oben" : "unten"}`}>
                          {dir === "up" ? <ArrowUp className="size-3.5" aria-hidden /> : <ArrowDown className="size-3.5" aria-hidden />}
                        </button>
                      </form>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <Link href={`/admin/leistungen/${s.id}`} className="font-medium hover:text-blue-soft">
                    {s.name}
                  </Link>
                  <span className="block text-xs text-muted">{s.categoryName ?? "–"}</span>
                </td>
                <td className="px-3 py-3">
                  {s.priceCents != null ? formatPrice(s.priceCents) : "–"}
                  <span className={`block text-xs ${s.pricePublished ? "text-emerald-400" : "text-gold"}`}>{s.pricePublished ? "veröffentlicht" : "Entwurf"}</span>
                </td>
                <td className="px-3 py-3">{s.durationMinutes} Min.</td>
                <td className="space-x-1 px-3 py-3 text-xs">
                  {s.archived ? <span className="chip">archiviert</span> : !s.active ? <span className="chip">inaktiv</span> : null}
                  {s.onlineBookable && !s.archived && s.active && <span className="chip border-blue/40 text-blue-soft">online buchbar</span>}
                  {s.featured && <span className="chip">Highlight</span>}
                </td>
                <td className="px-3 py-3 text-right">
                  <form action={archiveServiceAction}>
                    <input type="hidden" name="id" value={s.id} />
                    {s.archived && <input type="hidden" name="restore" value="true" />}
                    <button className="text-xs text-muted hover:text-fg">{s.archived ? "Wiederherstellen" : "Archivieren"}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
