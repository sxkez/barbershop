/**
 * Applies db/migrations/*.sql to the database in DATABASE_URL (Supabase).
 *   npm run db:migrate          → migrations only
 *   npm run db:seed             → migrations + initial seed (only if empty)
 * Without DATABASE_URL it migrates the local PGlite database in .data/pglite.
 */
import path from "node:path";
import { createPgliteDb, createPostgresDb, runMigrations, runSeed } from "../src/lib/db/factory";

async function main() {
  const seed = process.argv.includes("--seed");
  const url = process.env.DATABASE_URL;
  const db = url ? await createPostgresDb(url) : await createPgliteDb(path.join(process.cwd(), ".data", "pglite"));
  console.log(`Target: ${url ? "PostgreSQL (DATABASE_URL)" : "local PGlite (.data/pglite)"}`);
  await runMigrations(db);
  console.log("Migrations applied.");
  if (seed) console.log((await runSeed(db)) ? "Seed data inserted." : "Seed skipped (database not empty).");
  await db.close();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
