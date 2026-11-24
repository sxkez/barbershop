"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/catalog";
import { ProductCard } from "./ui";
import { cn } from "@/lib/format";

export function ProductGrid({ products, filters }: { products: Product[]; filters: { slug: string; name: string }[] }) {
  const [active, setActive] = useState<string>("alle");
  const shown = useMemo(() => (active === "alle" ? products : products.filter((p) => p.categorySlug === active)), [active, products]);

  return (
    <>
      <div role="group" aria-label="Kategorie filtern" className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
        {[{ slug: "alle", name: "Alle" }, ...filters].map((f) => (
          <button
            key={f.slug}
            type="button"
            aria-pressed={active === f.slug}
            onClick={() => setActive(f.slug)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
              active === f.slug ? "border-blue bg-blue text-white" : "border-line-strong text-fg/80 hover:border-fg/50 hover:text-fg",
            )}
          >
            {f.name}
          </button>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {shown.length} Produkte angezeigt
      </p>
      <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((p, i) => (
          <ProductCard key={p.id} product={p} priority={i < 4} />
        ))}
      </div>
    </>
  );
}
