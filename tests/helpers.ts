import { randomUUID } from "node:crypto";
import { createPgliteDb, runMigrations, runSeed } from "@/lib/db/factory";
import type { Db } from "@/lib/db/types";

/** Fresh in-memory PostgreSQL (PGlite) with the real migrations + seed applied. */
export async function freshDb(): Promise<Db> {
  const db = await createPgliteDb();
  await runMigrations(db);
  await runSeed(db);
  return db;
}

export async function serviceId(db: Db, slug: string): Promise<string> {
  const [row] = await db.query<{ id: string }>("select id from services where slug = $1", [slug]);
  return row.id;
}

export function bookingInput(svc: string, date: string, time: string, over: Partial<Record<string, string>> = {}) {
  return {
    serviceId: svc,
    date,
    time,
    fullName: "Test Kunde",
    email: `kunde+${randomUUID().slice(0, 8)}@example.test`,
    phone: "+49 170 0000000",
    idempotencyKey: randomUUID(),
    ...over,
  };
}

/** A "now" well before the first bookable day (1 Jan 2027). */
export const NOW = new Date("2026-12-20T09:00:00Z");
