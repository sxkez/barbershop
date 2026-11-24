import type { Queryable } from "@/lib/db/types";

export type Service = {
  id: string;
  slug: string;
  categoryId: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  name: string;
  description: string | null;
  includes: string | null;
  priceCents: number | null;
  pricePublished: boolean;
  compareAtCents: number | null;
  durationMinutes: number;
  onlineBookable: boolean;
  isPackage: boolean;
  featured: boolean;
  active: boolean;
  archived: boolean;
  imagePath: string | null;
  sortOrder: number;
};

export type Product = {
  id: string;
  slug: string;
  categoryId: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  kind: "product" | "merch";
  brand: string | null;
  name: string;
  variant: string | null;
  sizeLabel: string | null;
  scent: string | null;
  strength: string | null;
  description: string | null;
  detailsConfirmed: boolean;
  imagePath: string | null;
  imageAlt: string | null;
  photoNote: string | null;
  visible: boolean;
  featured: boolean;
  sortOrder: number;
};

export type Category = { id: string; slug: string; name: string; sortOrder: number; kind?: string };

function mapService(r: Record<string, unknown>): Service {
  return {
    id: r.id as string,
    slug: r.slug as string,
    categoryId: (r.category_id as string) ?? null,
    categorySlug: (r.category_slug as string) ?? null,
    categoryName: (r.category_name as string) ?? null,
    name: r.name as string,
    description: (r.description as string) ?? null,
    includes: (r.includes as string) ?? null,
    priceCents: (r.price_cents as number) ?? null,
    pricePublished: r.price_published as boolean,
    compareAtCents: (r.compare_at_cents as number) ?? null,
    durationMinutes: r.duration_minutes as number,
    onlineBookable: r.online_bookable as boolean,
    isPackage: r.is_package as boolean,
    featured: r.featured as boolean,
    active: r.active as boolean,
    archived: r.archived_at != null,
    imagePath: (r.image_path as string) ?? null,
    sortOrder: r.sort_order as number,
  };
}

function mapProduct(r: Record<string, unknown>): Product {
  return {
    id: r.id as string,
    slug: r.slug as string,
    categoryId: (r.category_id as string) ?? null,
    categorySlug: (r.category_slug as string) ?? null,
    categoryName: (r.category_name as string) ?? null,
    kind: ((r.kind as string) ?? "product") as "product" | "merch",
    brand: (r.brand as string) ?? null,
    name: r.name as string,
    variant: (r.variant as string) ?? null,
    sizeLabel: (r.size_label as string) ?? null,
    scent: (r.scent as string) ?? null,
    strength: (r.strength as string) ?? null,
    description: (r.description as string) ?? null,
    detailsConfirmed: r.details_confirmed as boolean,
    imagePath: (r.image_path as string) ?? null,
    imageAlt: (r.image_alt as string) ?? null,
    photoNote: (r.photo_note as string) ?? null,
    visible: r.visible as boolean,
    featured: r.featured as boolean,
    sortOrder: r.sort_order as number,
  };
}

const SERVICE_SELECT = `
  select s.*, c.slug as category_slug, c.name as category_name
    from services s left join service_categories c on c.id = s.category_id`;

export async function listServices(q: Queryable, opts: { includeInactive?: boolean } = {}) {
  const rows = await q.query(
    `${SERVICE_SELECT} ${opts.includeInactive ? "" : "where s.active and s.archived_at is null"}
     order by coalesce(c.sort_order, 99), s.sort_order, s.name`,
  );
  return rows.map(mapService);
}

export async function getService(q: Queryable, id: string) {
  const rows = await q.query(`${SERVICE_SELECT} where s.id = $1`, [id]);
  return rows[0] ? mapService(rows[0]) : null;
}

export async function listServiceCategories(q: Queryable): Promise<Category[]> {
  const rows = await q.query<Record<string, unknown>>("select * from service_categories order by sort_order, name");
  return rows.map((r) => ({ id: r.id as string, slug: r.slug as string, name: r.name as string, sortOrder: r.sort_order as number }));
}

const PRODUCT_SELECT = `
  select p.*, c.slug as category_slug, c.name as category_name, coalesce(c.kind, 'product') as kind
    from products p left join product_categories c on c.id = p.category_id`;

export async function listProducts(q: Queryable, opts: { kind?: "product" | "merch"; includeHidden?: boolean } = {}) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (!opts.includeHidden) where.push("p.visible");
  if (opts.kind) {
    params.push(opts.kind);
    where.push(`coalesce(c.kind, 'product') = $${params.length}`);
  }
  const rows = await q.query(
    `${PRODUCT_SELECT} ${where.length ? `where ${where.join(" and ")}` : ""} order by coalesce(c.sort_order, 99), p.sort_order, p.name`,
    params,
  );
  return rows.map(mapProduct);
}

export async function getProductBySlug(q: Queryable, slug: string) {
  const rows = await q.query(`${PRODUCT_SELECT} where p.slug = $1 and p.visible`, [slug]);
  return rows[0] ? mapProduct(rows[0]) : null;
}

export async function getProduct(q: Queryable, id: string) {
  const rows = await q.query(`${PRODUCT_SELECT} where p.id = $1`, [id]);
  return rows[0] ? mapProduct(rows[0]) : null;
}

export async function listProductCategories(q: Queryable): Promise<Category[]> {
  const rows = await q.query<Record<string, unknown>>("select * from product_categories order by sort_order, name");
  return rows.map((r) => ({
    id: r.id as string,
    slug: r.slug as string,
    name: r.name as string,
    sortOrder: r.sort_order as number,
    kind: r.kind as string,
  }));
}

export function productTitle(p: Pick<Product, "brand" | "name">) {
  return p.brand && !p.name.toLowerCase().startsWith(p.brand.toLowerCase()) ? `${p.brand} ${p.name}` : p.name;
}
