/**
 * Grants admin access to an existing Supabase Auth user.
 *
 * 1. Create the user in the Supabase dashboard (Authentication → Users → "Add user").
 *    Disable public sign-ups in Authentication → Providers → Email.
 * 2. Run:  npm run admin:create -- owner@example.com "Display Name" owner
 *
 * Requires DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from "@supabase/supabase-js";
import { createPostgresDb } from "../src/lib/db/factory";

async function main() {
  const [email, displayName = "", role = "owner"] = process.argv.slice(2);
  if (!email) throw new Error('Usage: npm run admin:create -- <email> ["Name"] [owner|admin|staff]');
  if (!["owner", "admin", "staff"].includes(role)) throw new Error("role must be owner, admin or staff");
  const { DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!DATABASE_URL || !NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  }
  const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  let userId: string | undefined;
  for (let page = 1; page <= 20 && !userId; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    userId = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;
    if (data.users.length < 100) break;
  }
  if (!userId) throw new Error(`No Supabase Auth user with e-mail ${email}. Create it in the dashboard first.`);
  const db = await createPostgresDb(DATABASE_URL);
  // If the Supabase user was deleted and re-created with the same e-mail, drop the stale entry.
  const stale = await db.query("delete from admin_profiles where lower(email) = lower($1) and user_id <> $2 returning user_id", [email, userId]);
  if (stale.length) console.log(`Removed ${stale.length} outdated admin entry for ${email} (old user ID).`);
  await db.query(
    `insert into admin_profiles (user_id, email, display_name, role, active) values ($1, $2, $3, $4, true)
     on conflict (user_id) do update set email = excluded.email, display_name = excluded.display_name, role = excluded.role, active = true`,
    [userId, email.toLowerCase(), displayName, role],
  );
  await db.close();
  console.log(`Admin access granted to ${email} (${role}).`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
