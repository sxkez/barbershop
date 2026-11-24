import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Store } from "lucide-react";
import { getDb } from "@/lib/db";
import { getProductBySlug, listProducts, productTitle } from "@/lib/catalog";
import { ProductCard } from "@/components/site/ui";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(await getDb(), slug);
  if (!p) return { title: "Produkt nicht gefunden" };
  return {
    title: productTitle(p),
    description: `${productTitle(p)}${p.description ? ` – ${p.description}` : ""} Im HANI BARBERSHOP in Landau erhältlich.`.slice(0, 160),
    alternates: { canonical: `/produkte/${p.slug}` },
    openGraph: p.imagePath ? { images: [{ url: p.imagePath }] } : undefined,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const db = await getDb();
  const product = await getProductBySlug(db, slug);
  if (!product) notFound();
  const related = (await listProducts(db, { kind: product.kind }))
    .filter((p) => p.id !== product.id && p.categorySlug === product.categorySlug)
    .slice(0, 4);

  const facts = [
    ["Marke", product.brand],
    ["Sorte / Variante", product.variant],
    ["Größe", product.sizeLabel],
    ["Duft", product.scent],
    ["Halt / Stärke", product.strength],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <div className="container-page pt-10 md:pt-14">
      <Link href="/produkte" className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Alle Produkte
      </Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="card product-stage relative aspect-square overflow-hidden">
          {product.imagePath && (
            <Image
              src={product.imagePath}
              alt={product.imageAlt ?? productTitle(product)}
              fill
              priority
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-contain p-10 drop-shadow-[0_30px_40px_rgba(0,0,0,0.65)] md:p-16"
            />
          )}
        </div>
        <div className="flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-soft">{product.categoryName}</p>
          <h1 className="display mt-3 text-3xl md:text-5xl">{productTitle(product)}</h1>
          <div className="brand-rule mt-5 w-32" aria-hidden />
          {product.description && <p className="mt-6 text-lg leading-relaxed text-fg/85">{product.description}</p>}
          {facts.length > 0 && (
            <dl className="mt-8 divide-y divide-line rounded-2xl border border-line">
              {facts.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-5 py-3 text-sm">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="mt-8 flex items-start gap-4 rounded-2xl border border-blue/30 bg-blue/5 p-5">
            <Store className="mt-0.5 size-6 shrink-0 text-blue-soft" aria-hidden />
            <div>
              <p className="font-semibold">Im Shop erhältlich</p>
              <p className="mt-1 text-sm text-muted">Kein Online-Verkauf. Frag uns im Laden nach Verfügbarkeit und Preis.</p>
            </div>
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <section className="mt-20" aria-labelledby="related">
          <h2 id="related" className="display mb-6 text-2xl">
            Mehr aus {product.categoryName}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
