"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { devLoginAllowed, signInDev, signOut, supabaseConfigured, supabaseServer } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/http";
import { audit } from "@/lib/audit";

const fail = (msg: string) => redirect(`/admin/login?error=${encodeURIComponent(msg)}`);

export async function loginAction(formData: FormData) {
  const db = await getDb();
  const rl = await rateLimit(db, { bucket: "admin-login", identifier: await clientIp(), limit: 8, windowSeconds: 900 });
  if (!rl.allowed) fail("Zu viele Anmeldeversuche. Bitte warte 15 Minuten.");
  const password = String(formData.get("password") ?? "");

  if (supabaseConfigured()) {
    const email = String(formData.get("email") ?? "").trim();
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) fail("E-Mail oder Passwort ist falsch.");
    const [profile] = await db.query("select 1 from admin_profiles where user_id = $1 and active", [data.user!.id]);
    if (!profile) {
      await supabase.auth.signOut();
      fail("Dieses Konto hat keinen Admin-Zugang.");
    }
    await audit(db, { type: "admin", id: data.user!.id }, "admin.login", "admin", data.user!.id);
    redirect("/admin");
  }
  if (devLoginAllowed()) {
    if (!(await signInDev(password))) fail("Passwort ist falsch.");
    redirect("/admin");
  }
  fail("Anmeldung ist nicht konfiguriert.");
}

export async function logoutAction() {
  await signOut();
  redirect("/admin/login");
}
