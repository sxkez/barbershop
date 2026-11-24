import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getDb } from "@/lib/db";
import { getService, listServiceCategories, type Service } from "@/lib/catalog";
import { Field, Flash, PageHeader, Panel, Toggle } from "@/components/admin/ui";
import { saveServiceAction } from "../../../actions/catalog";

export const metadata: Metadata = { title: "Leistung bearbeiten" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

const euro = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ","));

export default async function EditService({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const db = await getDb();
  const isNew = id === "neu";
  if (!isNew && !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const service: Partial<Service> | null = isNew ? { durationMinutes: 30, active: true } : await getService(db, id);
  if (!service) notFound();
  const categories = await listServiceCategories(db);

  return (
    <>
      <Link href="/admin/leistungen" className="mb-4 inline-flex items-center gap-2 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Alle Leistungen
      </Link>
      <PageHeader title={isNew ? "Neue Leistung" : (service.name ?? "")} />
      <Flash ok={sp.ok} error={sp.error} />
      <form action={saveServiceAction} className="grid max-w-4xl gap-6 lg:grid-cols-[1.4fr_1fr]">
        {!isNew && <input type="hidden" name="id" value={id} />}
        <Panel title="Details">
          <div className="grid gap-4">
            <Field label="Name" name="name">
              <input id="name" name="name" required defaultValue={service.name ?? ""} className="field" />
            </Field>
            <Field label="Kategorie" name="categoryId">
              <select id="categoryId" name="categoryId" defaultValue={service.categoryId ?? ""} className="field">
                <option value="">– keine –</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Enthaltene Leistungen" name="includes" hint="z. B. „Haarschnitt + Bart rasieren“">
              <input id="includes" name="includes" defaultValue={service.includes ?? ""} className="field" />
            </Field>
            <Field label="Beschreibung" name="description">
              <textarea id="description" name="description" defaultValue={service.description ?? ""} className="field min-h-24" />
            </Field>
            <Field label="Bild (optional, JPG/PNG/WebP, max. 5 MB)" name="image">
              <input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" className="field" />
            </Field>
            {service.imagePath && <Image src={service.imagePath} alt="" width={160} height={160} className="rounded-lg border border-line object-cover" />}
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel title="Preis & Dauer">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Preis (€)" name="price">
                  <input id="price" name="price" inputMode="decimal" defaultValue={euro(service.priceCents ?? null)} className="field" />
                </Field>
                <Field label="Statt-Preis (€)" name="compareAt">
                  <input id="compareAt" name="compareAt" inputMode="decimal" defaultValue={euro(service.compareAtCents ?? null)} className="field" />
                </Field>
              </div>
              <Toggle name="pricePublished" label="Preis veröffentlichen" defaultChecked={service.pricePublished} hint="Sonst steht auf der Website „Preis auf Anfrage“." />
              <Field label="Dauer (Minuten)" name="duration" hint="Bestimmt die Länge des buchbaren Zeitfensters.">
                <input id="duration" name="duration" type="number" min={5} max={480} step={5} required defaultValue={service.durationMinutes ?? 30} className="field" />
              </Field>
            </div>
          </Panel>
          <Panel title="Sichtbarkeit">
            <div className="grid gap-2.5">
              <Toggle name="active" label="Aktiv (auf der Website sichtbar)" defaultChecked={service.active} />
              <Toggle name="onlineBookable" label="Online buchbar" defaultChecked={service.onlineBookable} />
              <Toggle name="isPackage" label="Ist ein Paket" defaultChecked={service.isPackage} />
              <Toggle name="featured" label="Als Highlight auf der Startseite" defaultChecked={service.featured} />
            </div>
          </Panel>
          <button className="btn btn-primary w-full">Speichern</button>
        </div>
      </form>
    </>
  );
}
