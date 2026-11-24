import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import type { Product, Service } from "@/lib/catalog";
import { productTitle } from "@/lib/catalog";
import { cn, formatPrice, publicPrice } from "@/lib/format";

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "center",
  as: Tag = "h2",
  id,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  align?: "center" | "left";
  as?: "h1" | "h2";
  id?: string;
}) {
  return (
    <div className={cn("mb-10 md:mb-14", align === "center" ? "text-center" : "")}>
      {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
      <div className={cn("flex items-center gap-5", align === "center" ? "justify-center" : "")}>
        {align === "center" && <span aria-hidden className="hidden h-[3px] w-20 rounded-full bg-blue sm:block md:w-28" />}
        <Tag id={id} className="display text-3xl sm:text-4xl md:text-5xl">{title}</Tag>
        {align === "center" && <span aria-hidden className="hidden h-[3px] w-20 rounded-full bg-red sm:block md:w-28" />}
      </div>
      {align === "left" && <div className="brand-rule mt-5 w-40" aria-hidden />}
      {intro && (
        <p className={cn("mt-5 text-base leading-relaxed text-muted md:text-lg", align === "center" ? "mx-auto max-w-2xl" : "max-w-2xl")}>
          {intro}
        </p>
      )}
    </div>
  );
}

const PACKAGE_TONES = ["blue", "red", "blue"] as const;

export function PackageCard({ service, index }: { service: Service; index: number }) {
  const tone = PACKAGE_TONES[index % 3];
  const showPrice = service.pricePublished && service.priceCents != null;
  return (
    <article
      className={cn(
        "card card-hover group flex h-full flex-col overflow-hidden p-6 md:p-7",
        tone === "red" ? "border-red/70 hover:border-red" : "border-blue/60",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-32 opacity-60",
          tone === "red"
            ? "bg-[radial-gradient(60%_100%_at_50%_0%,rgba(216,58,67,0.22),transparent)]"
            : "bg-[radial-gradient(60%_100%_at_50%_0%,rgba(8,123,255,0.22),transparent)]",
        )}
      />
      <p className={cn("eyebrow relative", tone === "red" ? "text-red" : "text-blue-soft")}>Paket</p>
      <h3 className="display relative mt-2 text-2xl">{service.name.replace(/^Paket \d+ – /, "")}</h3>
      <p className="relative mt-1 text-sm font-semibold text-muted">{service.name.match(/^Paket \d+/)?.[0]}</p>
      {service.includes && <p className="relative mt-5 text-[0.95rem] leading-relaxed text-fg/90">{service.includes}</p>}
      {service.description && <p className="relative mt-2 text-sm leading-relaxed text-muted">{service.description}</p>}
      <div className="relative mt-auto flex items-end justify-between gap-4 pt-8">
        <div>
          {showPrice ? (
            <p className={cn("display text-4xl", tone === "red" ? "text-red" : "text-blue-soft")}>
              {formatPrice(service.priceCents!)}
              {service.compareAtCents && service.compareAtCents > service.priceCents! && (
                <span className="ml-2 align-middle text-base font-semibold text-muted line-through decoration-red">
                  {formatPrice(service.compareAtCents)}
                </span>
              )}
            </p>
          ) : (
            <p className="text-lg font-semibold text-fg/90">Preis auf Anfrage</p>
          )}
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            <Clock className="size-3.5" aria-hidden /> ca. {service.durationMinutes} Min.
          </p>
        </div>
        {service.onlineBookable && (
          <Link
            href={`/termin?leistung=${service.slug}`}
            className="grid size-11 place-items-center rounded-full border border-fg/70 transition-colors group-hover:border-blue group-hover:bg-blue"
            aria-label={`${service.name} buchen`}
          >
            <ArrowRight className="size-5" aria-hidden />
          </Link>
        )}
      </div>
    </article>
  );
}

export function ServiceRow({ service }: { service: Service }) {
  return (
    <li className="flex items-center gap-4 border-b border-line py-4 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-fg">{service.name}</p>
        <p className="mt-0.5 text-sm text-muted">
          {service.description ?? service.includes ?? ""}
          {(service.description || service.includes) && " · "}ca. {service.durationMinutes} Min.
        </p>
      </div>
      <p className={cn("shrink-0 text-right font-bold", service.pricePublished ? "text-blue-soft" : "text-sm font-semibold text-muted")}>
        {publicPrice(service)}
      </p>
      {service.onlineBookable ? (
        <Link href={`/termin?leistung=${service.slug}`} className="btn btn-ghost btn-sm shrink-0" aria-label={`${service.name} online buchen`}>
          Buchen
        </Link>
      ) : (
        <span className="hidden w-[76px] shrink-0 text-center text-xs text-muted sm:block">vor Ort</span>
      )}
    </li>
  );
}

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const meta = [product.variant, product.sizeLabel].filter(Boolean).join(" · ");
  return (
    <Link href={`/produkte/${product.slug}`} className="card card-hover group flex h-full flex-col overflow-hidden">
      <div className="product-stage relative aspect-[4/5] overflow-hidden rounded-t-[inherit]">
        {product.imagePath && (
          <Image
            src={product.imagePath}
            alt={product.imageAlt ?? productTitle(product)}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 22vw, (min-width: 640px) 33vw, 50vw"
            className="object-contain p-6 drop-shadow-[0_18px_24px_rgba(0,0,0,0.6)] transition-transform duration-500 group-hover:scale-[1.04] md:p-8"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 border-t border-line p-4 md:p-5">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-blue-soft">{product.categoryName}</p>
        <h3 className="font-bold leading-snug text-fg">{productTitle(product)}</h3>
        {meta && <p className="text-sm text-muted">{meta}</p>}
        <p className="mt-auto pt-3 text-xs font-medium text-fg/70">Im Shop erhältlich</p>
      </div>
    </Link>
  );
}

export function InfoBanner() {
  return (
    <div className="card relative overflow-hidden">
      <div aria-hidden className="barber-pole absolute inset-y-0 left-0 w-10 opacity-90 sm:w-16" />
      <div aria-hidden className="absolute inset-y-0 left-10 w-10 bg-gradient-to-r from-surface/0 to-surface sm:left-16" />
      <div className="relative grid gap-6 py-7 pl-16 pr-6 sm:pl-24 md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-10 md:py-9 md:pr-10">
        <div>
          <p className="eyebrow">Online-Termine</p>
          <p className="display mt-2 text-2xl md:text-3xl">Ab Januar 2027</p>
          <p className="mt-1 text-sm text-muted">Montag & Dienstag · 10:00 – 19:00 Uhr</p>
        </div>
        <div aria-hidden className="hidden h-16 w-px bg-line md:block" />
        <div>
          <p className="eyebrow">Ohne Termin</p>
          <p className="display mt-2 text-2xl text-red md:text-3xl">Einfach vorbeikommen</p>
          <p className="mt-1 text-sm text-muted">Mittwoch – Samstag · 10:00 – 19:00 Uhr</p>
        </div>
      </div>
    </div>
  );
}
