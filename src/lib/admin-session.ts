import type { Queryable } from "@/lib/db/types";
import { hmac, safeEqual } from "@/lib/security";

/** Signed, expiring dev-session value: "<expiresAtMs>.<hmac>" */
export function signDevSession(expiresAt: number, secret: string) {
  return `${expiresAt}.${hmac(`dev-admin:${expiresAt}`, secret)}`;
}

export function verifyDevSession(value: string | undefined, secret: string, now = Date.now()): boolean {
  if (!value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < now) return false;
  return safeEqual(sig, hmac(`dev-admin:${exp}`, secret));
}

/** Dev password login exists only outside production and only without Supabase Auth. */
export function devLoginEnabled(env: { NODE_ENV?: string; ADMIN_DEV_PASSWORD?: string; supabase: boolean }) {
  return !env.supabase && env.NODE_ENV !== "production" && Boolean(env.ADMIN_DEV_PASSWORD);
}

export type AdminProfile = { userId: string; email: string; role: "owner" | "admin" | "staff"; displayName: string };

/** Server-side authorization: an authenticated user is an admin only with an active admin_profiles row. */
export async function loadActiveAdmin(q: Queryable, userId: string): Promise<AdminProfile | null> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return null;
  const [row] = await q.query<{ user_id: string; email: string; role: AdminProfile["role"]; display_name: string }>(
    "select user_id, email, role, display_name from admin_profiles where user_id = $1 and active",
    [userId],
  );
  return row ? { userId: row.user_id, email: row.email, role: row.role, displayName: row.display_name || row.email } : null;
}
