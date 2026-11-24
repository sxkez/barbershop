import type { Metadata } from "next";
import Image from "next/image";
import { getDb } from "@/lib/db";
import { listProductCategories, listProducts, productTitle } from "@/lib/catalog";
import { SectionHeading } from "@/components/site/ui";
import { ProductGrid } from "@/components/site/ProductGrid";
import { Reveal } from "@/components/site/Reveal";

export const metadata: Metadata = {
  title: "Produkte",
  description: "Bandido Styling- und Pflegeprodukte: Aqua Wax, Styling Powder, Hair Spray, Colognes und Beard Oil – im HANI BARBERSHOP in Landau erhältlich.",
  alternates: { canonical: "/produkte" },
};

export default async function ProduktePage() {
  const db = await getDb();
  const [products, merch, categories] = await Promise.all([
    listProducts(db, { kind: "product" }),
    listProducts(db, { kind: "merch" }),
    listProductCategories(db),
  ]);
  const used = new Set(products.map((p) => p.categorySlug));
  const filters = categories.filter((c) => c.kind === "product" && used.has(c.slug)).map((c) => ({ slug: c.slug, name: c.name }));

  return (
    <div className="container-page pt-14 md:pt-20">
      <SectionHeading
        as="h1"
        eyebrow="Im Shop erhältlich"
        title="Unsere Produkte"
        intro="Hochwertige Styling- und Pflegeprodukte – bei uns im Laden. Kein Online-Shop: Komm vorbei und lass dich beraten."
      />
      <ProductGrid products={products} filters={filters} />

      {merch.length > 0 && (
        <section id="merch" className="mt-28" aria-labelledby="merch-h">
          <SectionHeading eyebrow="Unser Merch" title="HANI Merchandise" intro="Kleine Extras im HANI-Look – vor Ort im Shop." />
          <div className={merch.length === 1 ? "mx-auto grid max-w-2xl gap-5" : "grid gap-5 md:grid-cols-2"}>
            {merch.map((m) => (
              <Reveal key={m.id}>
                <article className="card grid h-full overflow-hidden sm:grid-cols-[1fr_1.1fr]">
                  {m.imagePath && (
                    <div className={`relative aspect-square sm:aspect-auto ${m.imagePath.includes("-official") ? "product-stage" : ""}`}>
                      <Image
                        src={m.imagePath}
                        alt={m.imageAlt ?? productTitle(m)}
                        fill
                        sizes="(min-width: 768px) 25vw, 100vw"
                        className={
                          m.imagePath.includes("-official")
                            ? "object-contain p-8 drop-shadow-[0_18px_24px_rgba(0,0,0,0.6)]"
                            : "object-cover"
                        }
                      />
                    </div>
                  )}
                  <div className="flex flex-col p-6">
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-red">HANI Merch</p>
                    <h3 className="display mt-2 text-xl">{m.name}</h3>
                    {m.description && <p className="mt-3 text-sm leading-relaxed text-muted">{m.description}</p>}
                    <p className="mt-auto pt-6 text-sm font-medium text-fg/80">Im Shop erhältlich · Frag einfach an der Theke</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
