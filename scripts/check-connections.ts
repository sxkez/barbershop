/**
 * Verifies the Supabase + Resend configuration without printing any secret.
 *   npm run check:connections
 */
import { createClient } from "@supabase/supabase-js";
import { createPostgresDb } from "../src/lib/db/factory";

type Result = { name: string; ok: boolean; detail: string };
const results: Result[] = [];
const add = (name: string, ok: boolean, detail: string) => results.push({ name, ok, detail });

async function main() {
  const env = process.env;

  // 1. Database
  if (!env.DATABASE_URL) add("Datenbank (DATABASE_URL)", false, "nicht gesetzt");
  else {
    try {
      const db = await createPostgresDb(env.DATABASE_URL);
      const [v] = await db.query<{ version: string }>("select version()");
      const [ext] = await db.query<{ ok: boolean }>("select exists(select 1 from pg_available_extensions where name = 'btree_gist') as ok");
      const [mig] = await db.query<{ ok: boolean }>("select to_regclass('public.schema_migrations') is not null as ok");
      add("Datenbank (DATABASE_URL)", true, `${v.version.split(",")[0]} · btree_gist ${ext.ok ? "verfügbar" : "FEHLT"} · Migrationen ${mig.ok ? "vorhanden" : "noch nicht ausgeführt"}`);
      await db.close();
    } catch (e) {
      add("Datenbank (DATABASE_URL)", false, e instanceof Error ? e.message.replace(/postgres(ql)?:\/\/\S+/g, "<url>") : "Fehler");
    }
  }

  // 2. Supabase Auth (publishable key)
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const pub = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !pub) add("Supabase Auth", false, "NEXT_PUBLIC_SUPABASE_URL oder Publishable Key fehlt");
  else {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: pub } }).catch(() => null);
    const body = res && res.ok ? ((await res.json()) as { disable_signup?: boolean }) : null;
    add(
      "Supabase Auth",
      Boolean(body),
      body ? `erreichbar · öffentliche Registrierung ${body.disable_signup ? "deaktiviert ✓" : "AKTIV – bitte deaktivieren"}` : `HTTP ${res?.status ?? "keine Verbindung"}`,
    );
  }

  // 3. Service role + storage bucket
  if (!url || !env.SUPABASE_SERVICE_ROLE_KEY) add("Supabase Storage", false, "SUPABASE_SERVICE_ROLE_KEY fehlt");
  else {
    const sb = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const bucket = env.SUPABASE_STORAGE_BUCKET ?? "media";
    const { data, error } = await sb.storage.getBucket(bucket);
    add("Supabase Storage", Boolean(data?.public), error ? error.message : data?.public ? `Bucket „${bucket}“ öffentlich ✓` : `Bucket „${bucket}“ ist nicht öffentlich`);
  }

  // 4. Resend
  if (!env.RESEND_API_KEY) add("Resend", false, "RESEND_API_KEY fehlt");
  else {
    const res = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` } }).catch(() => null);
    if (res?.ok) {
      const body = (await res.json()) as { data?: { name: string; status: string }[] };
      const domains = (body.data ?? []).map((d) => `${d.name} (${d.status})`).join(", ") || "keine eigene Domain";
      add("Resend", true, `Key gültig · Domains: ${domains}`);
    } else if (res?.status === 401 && (await res.text()).includes("restricted")) {
      add("Resend", true, "Key gültig (nur Senden erlaubt)");
    } else add("Resend", false, `HTTP ${res?.status ?? "keine Verbindung"}`);
  }
  add("Absender (EMAIL_FROM)", Boolean(env.EMAIL_FROM), env.EMAIL_FROM ? "gesetzt" : "fehlt");

  for (const r of results) console.log(`${r.ok ? "✔" : "✘"} ${r.name}: ${r.detail}`);
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

main();
