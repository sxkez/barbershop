import type { MetadataRoute } from "next";
import { getDb } from "@/lib/db";
import { listProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const pages = ["", "/leistungen", "/termin", "/produkte", "/kundenclub", "/ueber-uns", "/kontakt", "/impressum", "/datenschutz"];
  let products: { slug: string }[] = [];
  try {
    products = await listProducts(await getDb(), { kind: "product" });
  } catch {
    /* database unavailable — static pages only */
  }
  return [
    ...pages.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...products.map((p) => ({ url: `${base}/produkte/${p.slug}`, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
