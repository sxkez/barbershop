const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2, minimumFractionDigits: 0 });

export function formatPrice(cents: number): string {
  return eur.format(cents / 100);
}

/** Public price label: only published prices are shown. */
export function publicPrice(s: { priceCents: number | null; pricePublished: boolean }): string {
  return s.pricePublished && s.priceCents != null ? formatPrice(s.priceCents) : "Preis auf Anfrage";
}

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function telHref(phone: string) {
  return `tel:${phone.replace(/[^+\d]/g, "")}`;
}
