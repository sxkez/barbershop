import { timingSafeEqual } from "node:crypto";

/**
 * Pre-launch lock: when SITE_LOCK_PASSWORD is set, every page and API asks for
 * a username/password (HTTP Basic Auth) and search engines are told not to index.
 * Remove SITE_LOCK_PASSWORD in Vercel and redeploy to open the site.
 */
export type LockConfig = { user: string; password: string } | null;

export function lockConfig(env: { SITE_LOCK_PASSWORD?: string; SITE_LOCK_USER?: string }): LockConfig {
  const password = env.SITE_LOCK_PASSWORD?.trim();
  if (!password) return null;
  return { user: env.SITE_LOCK_USER?.trim() || "hani", password };
}

function equal(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  // compare against itself on length mismatch so timing does not reveal the length
  return ab.length === bb.length ? timingSafeEqual(ab, bb) : (timingSafeEqual(ab, ab), false);
}

/** true = request may pass */
export function checkBasicAuth(header: string | null, cfg: LockConfig): boolean {
  if (!cfg) return true;
  if (!header?.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  } catch {
    return false;
  }
  const i = decoded.indexOf(":");
  if (i < 0) return false;
  const userOk = equal(decoded.slice(0, i), cfg.user);
  const passOk = equal(decoded.slice(i + 1), cfg.password);
  return userOk && passOk;
}
