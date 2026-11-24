import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { getDb } from "@/lib/db";
import { hmac, safeEqual, sessionSecret } from "@/lib/security";
import { devLoginEnabled, loadActiveAdmin, signDevSession, verifyDevSession, type AdminProfile } from "@/lib/admin-session";

export type AdminUser = AdminProfile;

const DEV_COOKIE = "hani_admin_dev";
const DEV_ADMIN_ID = "00000000-0000-4000-8000-000000000001";

function supabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function supabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && supabaseAnonKey());
}

/** Local development without Supabase: password from ADMIN_DEV_PASSWORD. Never in production. */
export function devLoginAllowed() {
  return devLoginEnabled({ NODE_ENV: process.env.NODE_ENV, ADMIN_DEV_PASSWORD: process.env.ADMIN_DEV_PASSWORD, supabase: supabaseConfigured() });
}

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, supabaseAnonKey()!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const c of list) store.set(c.name, c.value, c.options);
        } catch {
          // Called from a Server Component — cookies are refreshed on the next action.
        }
      },
    },
  });
}

/** Returns the signed-in admin, or null. Authorization is checked against admin_profiles on every call. */
export async function getAdmin(): Promise<AdminUser | null> {
  if (supabaseConfigured()) {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    return loadActiveAdmin(await getDb(), data.user.id);
  }
  if (devLoginAllowed()) {
    const value = (await cookies()).get(DEV_COOKIE)?.value;
    if (!verifyDevSession(value, sessionSecret())) return null;
    return { userId: DEV_ADMIN_ID, email: "dev@localhost", role: "owner", displayName: "Entwicklungs-Admin" };
  }
  return null;
}

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function signInDev(password: string): Promise<boolean> {
  if (!devLoginAllowed()) return false;
  if (!safeEqual(hmac(password, sessionSecret()), hmac(process.env.ADMIN_DEV_PASSWORD!, sessionSecret()))) return false;
  const exp = Date.now() + 8 * 3600_000;
  (await cookies()).set(DEV_COOKIE, signDevSession(exp, sessionSecret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 8 * 3600,
  });
  return true;
}

export async function signOut() {
  if (supabaseConfigured()) {
    const supabase = await supabaseServer();
    await supabase.auth.signOut();
  }
  (await cookies()).delete(DEV_COOKIE);
}
