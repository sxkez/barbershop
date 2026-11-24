import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getDb } from "@/lib/db";
import { getProduct, listProductCategories, type Product } from "@/lib/catalog";
import { Field, Flash, PageHeader, Panel, Toggle } from "@/components/admin/ui";
import { saveProductAction } from "../../../actions/catalog";

export const metadata: Metadata = { title: "Produkt bearbeiten" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

export default async function EditProduct({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const db = await getDb();
  const isNew = id === "neu";
  if (!isNew && !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const product: Partial<Product> | null = isNew ? { visible: true, brand: "Bandido" } : await getProduct(db, id);
  if (!product) notFound();
  const categories = await listProductCategories(db);

  return (
    <>
      <Link href="/admin/produkte" className="mb-4 inline-flex items-center gap-2 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Alle Produkte
      </Link>
      <PageHeader title={isNew ? "Neues Produkt" : (product.name ?? "")} description={product.photoNote ? `Foto: ${product.photoNote}` : undefined} />
      <Flash ok={sp.ok} error={sp.error} />
      <form action={saveProductAction} className="grid max-w-5xl gap-6 lg:grid-cols-[1.4fr_1fr]">
        {!isNew && <input type="hidden" name="id" value={id} />}
        <Panel title="Angaben">
          <p className="mb-4 text-xs text-muted">Nur bestätigte Angaben eintragen (z. B. vom Etikett). Leere Felder werden auf der Website nicht angezeigt.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Marke" name="brand">
              <input id="brand" name="brand" defaultValue={product.brand ?? ""} className="field" />
            </Field>
            <Field label="Produktname" name="name">
              <input id="name" name="name" required defaultValue={product.name ?? ""} className="field" />
            </Field>
            <Field label="Kategorie" name="categoryId">
              <select id="categoryId" name="categoryId" defaultValue={product.categoryId ?? ""} className="field">
                <option value="">– keine –</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sorte / Variante" name="variant">
              <input id="variant" name="variant" defaultValue={product.variant ?? ""} className="field" />
            </Field>
            <Field label="Größe" name="sizeLabel">
              <input id="sizeLabel" name="sizeLabel" defaultValue={product.sizeLabel ?? ""} className="field" placeholder="z. B. 150 ml" />
            </Field>
            <Field label="Duft" name="scent">
              <input id="scent" name="scent" defaultValue={product.scent ?? ""} className="field" />
            </Field>
            <Field label="Halt / Stärke" name="strength">
              <input id="strength" name="strength" defaultValue={product.strength ?? ""} className="field" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Beschreibung" name="description">
                <textarea id="description" name="description" defaultValue={product.description ?? ""} className="field min-h-28" />
              </Field>
            </div>
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel title="Foto">
            <div className="product-stage relative mb-4 aspect-square overflow-hidden rounded-xl">
              {product.imagePath && <Image src={product.imagePath} alt="" fill sizes="320px" className="object-contain p-6" />}
            </div>
            <Field label="Neues Foto hochladen" name="image" hint="JPG, PNG oder WebP, max. 5 MB. Freigestellte PNG/WebP sehen am besten aus.">
              <input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" className="field" />
            </Field>
            <div className="mt-4">
              <Field label="Bildbeschreibung (Alt-Text)" name="imageAlt">
                <input id="imageAlt" name="imageAlt" defaultValue={product.imageAlt ?? ""} className="field" />
              </Field>
            </div>
          </Panel>
          <Panel title="Sichtbarkeit">
            <div className="grid gap-2.5">
              <Toggle name="visible" label="Auf der Website anzeigen" defaultChecked={product.visible} />
              <Toggle name="featured" label="Auf der Startseite hervorheben" defaultChecked={product.featured} />
              <Toggle name="detailsConfirmed" label="Angaben vom Inhaber bestätigt" defaultChecked={product.detailsConfirmed} />
            </div>
          </Panel>
          <button className="btn btn-primary w-full">Speichern</button>
        </div>
      </form>
    </>
  );
}
