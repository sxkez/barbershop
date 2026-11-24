"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db/types";
import { audit } from "@/lib/audit";
import { isLocalDate, isLocalTime } from "@/lib/time";
import { saveImage, UploadError } from "@/lib/storage";
import { bool, done, errMsg, euroToCents, int, optStr, slugify, str } from "./_helpers";

const UUID = /^[0-9a-f-]{36}$/i;

function revalidatePublic() {
  for (const p of ["/", "/leistungen", "/termin", "/produkte", "/kundenclub", "/kontakt"]) revalidatePath(p);
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

/** Replaces the weekly booking hours. Each weekday may have up to 3 intervals. */
export async function saveAvailabilityRulesAction(fd: FormData) {
  const admin = await requireAdmin();
  const validFrom = str(fd, "validFrom");
  if (validFrom && !isLocalDate(validFrom)) done("/admin/verfuegbarkeit", { error: "Ungültiges Startdatum." });
  const rows: { weekday: number; start: string; end: string }[] = [];
  for (let wd = 1; wd <= 7; wd++) {
    for (let i = 0; i < 3; i++) {
      const start = str(fd, `r${wd}_${i}_start`);
      const end = str(fd, `r${wd}_${i}_end`);
      if (!start && !end) continue;
      if (!isLocalTime(start) || !isLocalTime(end) || end <= start) {
        done("/admin/verfuegbarkeit", { error: `Ungültige Zeiten am Wochentag ${wd}.` });
      }
      rows.push({ weekday: wd, start, end });
    }
  }
  const db = await getDb();
  await db.tx(async (q) => {
    await q.query("delete from availability_rules where barber_id is null");
    for (const r of rows) {
      await q.query("insert into availability_rules (weekday, start_time, end_time, valid_from) values ($1, $2, $3, $4)", [
        r.weekday,
        r.start,
        r.end,
        validFrom || null,
      ]);
    }
    await audit(q, { type: "admin", id: admin.userId }, "availability.rules_saved", "availability_rules", null, { rows, validFrom });
  });
  revalidatePublic();
  done("/admin/verfuegbarkeit", { ok: "Buchungszeiten gespeichert." });
}

export async function addExceptionAction(fd: FormData) {
  const admin = await requireAdmin();
  const date = str(fd, "date");
  const dateTo = str(fd, "dateTo") || date;
  const kind = str(fd, "kind");
  const start = str(fd, "start");
  const end = str(fd, "end");
  const reason = optStr(fd, "reason");
  if (!isLocalDate(date) || !isLocalDate(dateTo) || dateTo < date) done("/admin/verfuegbarkeit", { error: "Bitte gültige Daten angeben." });
  if (!["closed", "break", "extra_open"].includes(kind)) done("/admin/verfuegbarkeit", { error: "Ungültige Art." });
  const timed = Boolean(start || end);
  if (timed && (!isLocalTime(start) || !isLocalTime(end) || end <= start)) done("/admin/verfuegbarkeit", { error: "Ungültige Uhrzeiten." });
  if ((kind === "extra_open" || kind === "break") && !timed) done("/admin/verfuegbarkeit", { error: "Für Pausen und Zusatzzeiten bitte Uhrzeiten angeben." });
  const db = await getDb();
  const days: string[] = [];
  for (let d = new Date(`${date}T00:00:00Z`); d <= new Date(`${dateTo}T00:00:00Z`) && days.length < 62; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }
  await db.tx(async (q) => {
    for (const d of days) {
      await q.query("insert into availability_exceptions (date, kind, start_time, end_time, reason) values ($1, $2, $3, $4, $5)", [
        d,
        kind,
        timed ? start : null,
        timed ? end : null,
        reason,
      ]);
    }
    await audit(q, { type: "admin", id: admin.userId }, "availability.exception_added", "availability_exceptions", null, { date, dateTo, kind, start, end });
  });
  revalidatePublic();
  done("/admin/verfuegbarkeit", { ok: `${days.length} Ausnahme(n) gespeichert.` });
}

export async function deleteExceptionAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  if (!UUID.test(id)) done("/admin/verfuegbarkeit", { error: "Ungültig." });
  const db = await getDb();
  await db.query("delete from availability_exceptions where id = $1", [id]);
  await audit(db, { type: "admin", id: admin.userId }, "availability.exception_deleted", "availability_exceptions", id);
  revalidatePublic();
  done("/admin/verfuegbarkeit", { ok: "Ausnahme gelöscht." });
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export async function saveServiceAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const back = id ? `/admin/leistungen/${id}` : "/admin/leistungen/neu";
  const name = str(fd, "name");
  if (name.length < 2) done(back, { error: "Bitte einen Namen angeben." });
  let price: number | null;
  let compareAt: number | null;
  try {
    price = euroToCents(str(fd, "price"));
    compareAt = euroToCents(str(fd, "compareAt"));
  } catch {
    done(back, { error: "Ungültiger Preis." });
  }
  const duration = int(fd, "duration");
  if (!duration || duration < 5 || duration > 480) done(back, { error: "Dauer muss zwischen 5 und 480 Minuten liegen." });
  const pricePublished = bool(fd, "pricePublished");
  if (pricePublished && price! === null) done(back, { error: "Zum Veröffentlichen bitte einen Preis eintragen." });
  const categoryId = optStr(fd, "categoryId");

  let imagePath: string | null | undefined = undefined;
  const file = fd.get("image");
  if (file instanceof File && file.size > 0) {
    try {
      imagePath = await saveImage(file, "services");
    } catch (err) {
      done(back, { error: err instanceof UploadError ? err.message : "Upload fehlgeschlagen." });
    }
  }

  const values = [
    name,
    optStr(fd, "description"),
    optStr(fd, "includes"),
    price!,
    pricePublished,
    compareAt!,
    duration,
    bool(fd, "onlineBookable"),
    bool(fd, "isPackage"),
    bool(fd, "featured"),
    bool(fd, "active"),
    categoryId && UUID.test(categoryId) ? categoryId : null,
  ];
  const db = await getDb();
  let savedId = id;
  try {
    if (id) {
      await db.query(
        `update services set name=$2, description=$3, includes=$4, price_cents=$5, price_published=$6, compare_at_cents=$7,
           duration_minutes=$8, online_bookable=$9, is_package=$10, featured=$11, active=$12, category_id=$13,
           image_path = coalesce($14, image_path), updated_at = now() where id = $1`,
        [id, ...values, imagePath ?? null],
      );
    } else {
      const [{ max }] = await db.query<{ max: number }>("select coalesce(max(sort_order), 0)::int as max from services");
      const [row] = await db.query<{ id: string }>(
        `insert into services (name, description, includes, price_cents, price_published, compare_at_cents, duration_minutes,
            online_bookable, is_package, featured, active, category_id, image_path, slug, sort_order)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) returning id`,
        [...values, imagePath ?? null, `${slugify(name)}-${Date.now().toString(36).slice(-4)}`, max + 10],
      );
      savedId = row.id;
    }
    await audit(db, { type: "admin", id: admin.userId }, id ? "service.updated" : "service.created", "service", savedId, {
      price_cents: price!,
      price_published: pricePublished,
      duration,
    });
  } catch (err) {
    done(back, { error: errMsg(err) });
  }
  revalidatePublic();
  done(`/admin/leistungen/${savedId}`, { ok: "Gespeichert." });
}

export async function archiveServiceAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const restore = bool(fd, "restore");
  const db = await getDb();
  await db.query(`update services set archived_at = ${restore ? "null" : "now()"}, updated_at = now() where id = $1`, [id]);
  await audit(db, { type: "admin", id: admin.userId }, restore ? "service.restored" : "service.archived", "service", id);
  revalidatePublic();
  done("/admin/leistungen", { ok: restore ? "Wiederhergestellt." : "Archiviert." });
}

async function move(table: "services" | "products", id: string, dir: "up" | "down") {
  const db = await getDb();
  const rows = await db.query<{ id: string }>(`select id from ${table} order by sort_order, name`);
  const i = rows.findIndex((r) => r.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return;
  [rows[i], rows[j]] = [rows[j], rows[i]];
  await db.tx(async (q) => {
    for (let k = 0; k < rows.length; k++) await q.query(`update ${table} set sort_order = $2 where id = $1`, [rows[k].id, (k + 1) * 10]);
  });
}

export async function moveServiceAction(fd: FormData) {
  await requireAdmin();
  await move("services", str(fd, "id"), str(fd, "dir") === "up" ? "up" : "down");
  revalidatePublic();
  done("/admin/leistungen", {});
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function saveProductAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const back = id ? `/admin/produkte/${id}` : "/admin/produkte/neu";
  const name = str(fd, "name");
  if (name.length < 2) done(back, { error: "Bitte einen Namen angeben." });
  let imagePath: string | null = null;
  const file = fd.get("image");
  if (file instanceof File && file.size > 0) {
    try {
      imagePath = await saveImage(file, "products");
    } catch (err) {
      done(back, { error: err instanceof UploadError ? err.message : "Upload fehlgeschlagen." });
    }
  }
  const categoryId = optStr(fd, "categoryId");
  const values = [
    name,
    optStr(fd, "brand"),
    optStr(fd, "variant"),
    optStr(fd, "sizeLabel"),
    optStr(fd, "scent"),
    optStr(fd, "strength"),
    optStr(fd, "description"),
    bool(fd, "detailsConfirmed"),
    optStr(fd, "imageAlt"),
    bool(fd, "visible"),
    bool(fd, "featured"),
    categoryId && UUID.test(categoryId) ? categoryId : null,
  ];
  const db = await getDb();
  let savedId = id;
  try {
    if (id) {
      await db.query(
        `update products set name=$2, brand=$3, variant=$4, size_label=$5, scent=$6, strength=$7, description=$8,
           details_confirmed=$9, image_alt=$10, visible=$11, featured=$12, category_id=$13,
           image_path = coalesce($14, image_path),
           photo_note = case when $14::text is not null then 'Vom Inhaber hochgeladen.' else photo_note end,
           updated_at = now() where id = $1`,
        [id, ...values, imagePath],
      );
    } else {
      const [{ max }] = await db.query<{ max: number }>("select coalesce(max(sort_order), 0)::int as max from products");
      const [row] = await db.query<{ id: string }>(
        `insert into products (name, brand, variant, size_label, scent, strength, description, details_confirmed, image_alt, visible, featured,
           category_id, image_path, slug, sort_order)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) returning id`,
        [...values, imagePath, slugify(`${str(fd, "brand")} ${name}`) || `produkt-${Date.now()}`, max + 10],
      );
      savedId = row.id;
    }
    await audit(db, { type: "admin", id: admin.userId }, id ? "product.updated" : "product.created", "product", savedId, { image: Boolean(imagePath) });
  } catch (err) {
    if (isUniqueViolation(err)) done(back, { error: "Ein Produkt mit diesem Namen existiert bereits." });
    done(back, { error: errMsg(err) });
  }
  revalidatePublic();
  done(`/admin/produkte/${savedId}`, { ok: "Gespeichert." });
}

export async function toggleProductAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const db = await getDb();
  await db.query("update products set visible = not visible, updated_at = now() where id = $1", [id]);
  await audit(db, { type: "admin", id: admin.userId }, "product.visibility_toggled", "product", id);
  revalidatePublic();
  done("/admin/produkte", { ok: "Sichtbarkeit geändert." });
}

export async function moveProductAction(fd: FormData) {
  await requireAdmin();
  await move("products", str(fd, "id"), str(fd, "dir") === "up" ? "up" : "down");
  revalidatePublic();
  done("/admin/produkte", {});
}
