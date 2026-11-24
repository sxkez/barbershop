import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { devLoginEnabled, loadActiveAdmin, signDevSession, verifyDevSession } from "@/lib/admin-session";
import type { Db } from "@/lib/db/types";
import { freshDb } from "./helpers";

const SECRET = "test-secret-test-secret-test-secret-123";

describe("admin session", () => {
  it("accepts a valid, unexpired signed session", () => {
    const v = signDevSession(Date.now() + 60_000, SECRET);
    expect(verifyDevSession(v, SECRET)).toBe(true);
  });

  it("rejects expired, forged, tampered or missing sessions", () => {
    expect(verifyDevSession(signDevSession(Date.now() - 1, SECRET), SECRET)).toBe(false);
    expect(verifyDevSession(signDevSession(Date.now() + 60_000, "other-secret-other-secret-other-1234"), SECRET)).toBe(false);
    const [, sig] = signDevSession(Date.now() + 60_000, SECRET).split(".");
    expect(verifyDevSession(`${Date.now() + 9_999_999}.${sig}`, SECRET)).toBe(false); // extended expiry
    expect(verifyDevSession("garbage", SECRET)).toBe(false);
    expect(verifyDevSession(undefined, SECRET)).toBe(false);
  });

  it("dev password login is never available in production or with Supabase", () => {
    expect(devLoginEnabled({ NODE_ENV: "development", ADMIN_DEV_PASSWORD: "x", supabase: false })).toBe(true);
    expect(devLoginEnabled({ NODE_ENV: "production", ADMIN_DEV_PASSWORD: "x", supabase: false })).toBe(false);
    expect(devLoginEnabled({ NODE_ENV: "development", ADMIN_DEV_PASSWORD: "x", supabase: true })).toBe(false);
    expect(devLoginEnabled({ NODE_ENV: "development", ADMIN_DEV_PASSWORD: "", supabase: false })).toBe(false);
  });
});

describe("admin authorization (admin_profiles)", () => {
  let db: Db;
  const active = "11111111-1111-4111-8111-111111111111";
  const inactive = "22222222-2222-4222-8222-222222222222";
  beforeAll(async () => {
    db = await freshDb();
    await db.query("insert into admin_profiles (user_id, email, role, active) values ($1, 'owner@example.test', 'owner', true), ($2, 'old@example.test', 'admin', false)", [
      active,
      inactive,
    ]);
  });
  afterAll(async () => db.close());

  it("authenticated user without a profile is not an admin", async () => {
    expect(await loadActiveAdmin(db, "33333333-3333-4333-8333-333333333333")).toBeNull();
  });
  it("deactivated admin is rejected", async () => {
    expect(await loadActiveAdmin(db, inactive)).toBeNull();
  });
  it("active admin is accepted with role", async () => {
    expect(await loadActiveAdmin(db, active)).toMatchObject({ role: "owner", email: "owner@example.test" });
  });
  it("malformed ids are rejected before querying", async () => {
    expect(await loadActiveAdmin(db, "' or 1=1 --")).toBeNull();
  });
});

describe("every admin server action checks authorization", () => {
  const dir = path.resolve(__dirname, "../src/app/admin/actions");
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.startsWith("_") && f !== "auth.ts");
  for (const file of files) {
    it(`${file}: each exported action calls requireAdmin() first`, () => {
      const src = readFileSync(path.join(dir, file), "utf8");
      expect(src.startsWith('"use server"')).toBe(true);
      const actions = [...src.matchAll(/export async function (\w+)\([^)]*\)\s*\{\n([^\n]*)/g)];
      expect(actions.length).toBeGreaterThan(0);
      for (const [, name, firstLine] of actions) {
        expect(firstLine, `${name} must start with requireAdmin()`).toMatch(/await requireAdmin\(\)/);
      }
      expect(statSync(path.join(dir, file)).size).toBeGreaterThan(0);
    });
  }
});

describe("database is locked down", () => {
  it("every table in the migration enables row level security", () => {
    const sql = readFileSync(path.resolve(__dirname, "../db/migrations/0001_init.sql"), "utf8");
    const tables = [...sql.matchAll(/^create table (\w+)/gm)].map((m) => m[1]);
    for (const t of tables) expect(sql, `RLS for ${t}`).toMatch(new RegExp(`alter table ${t}\\s+enable row level security`));
  });
});
