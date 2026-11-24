import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus } from "lucide-react";
import { getDb } from "@/lib/db";
import { listProducts, productTitle } from "@/lib/catalog";
import { Flash, PageHeader } from "@/components/admin/ui";
import { moveProductAction, toggleProductAction } from "../../actions/catalog";

export const metadata: Metadata = { title: "Produkte" };

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

export default async function AdminProducts({ searchParams }: Props) {
  const sp = await searchParams;
  const products = await listProducts(await getDb(), { includeHidden: true });
  return (
    <>
      <PageHeader
        title="Produkte & Merch"
        description="Nur Schaufenster – kein Online-Verkauf. Reihenfolge, Sichtbarkeit und Fotos hier pflegen."
        actions={
          <Link href="/admin/produkte/neu" className="btn btn-primary btn-sm">
            <Plus className="size-4" aria-hidden /> Neues Produkt
          </Link>
        }
      />
      <Flash ok={sp.ok} error={sp.error} />
      <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
        {products.map((p) => (
          <li key={p.id} className={`flex items-center gap-3 px-3 py-2.5 ${p.visible ? "" : "opacity-50"}`}>
            <div className="flex gap-1">
              {(["up", "down"] as const).map((dir) => (
                <form key={dir} action={moveProductAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="dir" value={dir} />
                  <button className="btn btn-ghost btn-sm size-8 p-0" aria-label={`${p.name} nach ${dir === "up" ? "oben" : "unten"}`}>
                    {dir === "up" ? <ArrowUp className="size-3.5" aria-hidden /> : <ArrowDown className="size-3.5" aria-hidden />}
                  </button>
                </form>
              ))}
            </div>
            <div className="product-stage relative size-14 shrink-0 overflow-hidden rounded-lg">
              {p.imagePath && <Image src={p.imagePath} alt="" fill sizes="56px" className="object-contain p-1" />}
            </div>
            <Link href={`/admin/produkte/${p.id}`} className="min-w-0 flex-1">
              <span className="block truncate font-medium hover:text-blue-soft">{productTitle(p)}</span>
              <span className="block truncate text-xs text-muted">
                {p.categoryName ?? "–"}
                {!p.detailsConfirmed && <span className="text-gold"> · Angaben unbestätigt</span>}
              </span>
            </Link>
            <form action={toggleProductAction}>
              <input type="hidden" name="id" value={p.id} />
              <button className="btn btn-ghost btn-sm" aria-label={p.visible ? "Ausblenden" : "Einblenden"} title={p.visible ? "Ausblenden" : "Einblenden"}>
                {p.visible ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}
