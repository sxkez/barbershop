import "server-only";
import { redirect } from "next/navigation";

export function done(path: string, msg: { ok?: string; error?: string }): never {
  const sp = new URLSearchParams();
  if (msg.ok) sp.set("ok", msg.ok);
  if (msg.error) sp.set("error", msg.error);
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${sp.toString()}`);
}

export function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export function optStr(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v ? v : null;
}

export function bool(fd: FormData, key: string): boolean {
  return fd.get(key) === "on" || fd.get(key) === "true";
}

export function int(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** "32", "32,00", "32.5" → cents */
export function euroToCents(v: string): number | null {
  const t = v.replace(/\s|€/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > 10000) throw new Error("Ungültiger Preis");
  return Math.round(n * 100);
}

export function errMsg(err: unknown) {
  return err instanceof Error ? err.message : "Unbekannter Fehler";
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
