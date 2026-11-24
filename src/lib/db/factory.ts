import fs from "node:fs/promises";
import path from "node:path";
import type { Db, Queryable } from "./types";

// OIDs: 1082 = date, 1114 = timestamp, 20 = int8.
const DATE_OID = 1082;
const INT8_OID = 20;

/** Production: Supabase PostgreSQL through a pooled, server-only connection. */
export async function createPostgresDb(connectionString: string): Promise<Db> {
  const pg = await import("pg");
  const { Pool, types } = pg.default ?? pg;
  types.setTypeParser(DATE_OID, (v: string) => v);
  types.setTypeParser(INT8_OID, (v: string) => Number(v));
  const pool = new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    ssl: /sslmode=disable|localhost|127\.0\.0\.1/.test(connectionString) ? undefined : { rejectUnauthorized: false },
  });
  const run: Queryable["query"] = async (text, params) => (await pool.query(text, params as unknown[])).rows;
  return {
    kind: "postgres",
    query: run,
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const result = await fn({
          query: async (text, params) => (await client.query(text, params as unknown[])).rows,
        });
        await client.query("commit");
        return result;
      } catch (err) {
        await client.query("rollback").catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
    exec: async (sql) => {
      await pool.query(sql);
    },
    close: () => pool.end(),
  };
}

/** Local development & tests: embedded PostgreSQL (PGlite). `dataDir` undefined = in-memory. */
export async function createPgliteDb(dataDir?: string): Promise<Db> {
  const { PGlite, types } = await import("@electric-sql/pglite");
  const { btree_gist } = await import("@electric-sql/pglite/contrib/btree_gist");
  if (dataDir) await fs.mkdir(dataDir, { recursive: true });
  const parsers = {
    [types.DATE]: (v: string) => v,
    [INT8_OID]: (v: string) => Number(v),
  };
  const pg = await PGlite.create(dataDir ? { dataDir, extensions: { btree_gist }, parsers } : { extensions: { btree_gist }, parsers });
  return {
    kind: "pglite",
    query: async (text, params) => (await pg.query(text, params as unknown[])).rows as never,
    tx: (fn) =>
      pg.transaction((t) =>
        fn({ query: async (text, params) => (await t.query(text, params as unknown[])).rows as never }),
      ),
    exec: async (sql) => {
      await pg.exec(sql);
    },
    close: () => pg.close(),
  };
}

export async function runMigrations(db: Db, migrationsDir = path.join(process.cwd(), "db", "migrations")) {
  await db.query(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  await db.query("alter table schema_migrations enable row level security");
  const applied = new Set((await db.query<{ name: string }>("select name from schema_migrations")).map((r) => r.name));
  const files = (await fs.readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    await execScript(db, sql);
    await db.query("insert into schema_migrations (name) values ($1)", [file]);
  }
}

export async function runSeed(db: Db, seedFile = path.join(process.cwd(), "db", "seed.sql")) {
  const [{ count }] = await db.query<{ count: number }>("select count(*)::int as count from business_settings");
  if (count > 0) return false;
  await execScript(db, await fs.readFile(seedFile, "utf8"));
  return true;
}

async function execScript(db: Db, sql: string) {
  await db.exec(sql);
}

export async function createDbFromEnv(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) return createPostgresDb(url);
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PGLITE_IN_PRODUCTION !== "true") {
    throw new Error("DATABASE_URL is not set. Configure the Supabase PostgreSQL connection string.");
  }
  const dir = process.env.PGLITE_DATA_DIR ?? path.join(process.cwd(), ".data", "pglite");
  const db = await createPgliteDb(dir);
  await runMigrations(db);
  await runSeed(db);
  return db;
}
