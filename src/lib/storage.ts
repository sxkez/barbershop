import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const MAX_BYTES = 5 * 1024 * 1024;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "media";

function sniff(buf: Buffer): { ext: string; mime: string } | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", mime: "image/png" };
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return { ext: "webp", mime: "image/webp" };
  return null;
}

export class UploadError extends Error {}

/**
 * Validates and stores an uploaded image. Only real JPEG/PNG/WebP files (checked
 * by content, not by the file name) up to 5 MB are accepted. SVG is rejected.
 * Production: Supabase Storage (public bucket). Development: /public/uploads.
 */
export async function saveImage(file: File, folder: "products" | "services"): Promise<string> {
  if (!file || file.size === 0) throw new UploadError("Keine Datei ausgewählt.");
  if (file.size > MAX_BYTES) throw new UploadError("Die Datei ist größer als 5 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniff(buf);
  if (!type) throw new UploadError("Nur JPG, PNG oder WebP-Bilder sind erlaubt.");
  const name = `${folder}/${randomUUID()}.${type.ext}`;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await supabase.storage.from(BUCKET).upload(name, buf, { contentType: type.mime, upsert: false, cacheControl: "31536000" });
    if (error) throw new UploadError(`Upload fehlgeschlagen: ${error.message}`);
    return supabase.storage.from(BUCKET).getPublicUrl(name).data.publicUrl;
  }
  if (process.env.NODE_ENV === "production") {
    throw new UploadError("Bild-Upload ist nicht konfiguriert (Supabase Storage fehlt).");
  }
  const dest = path.join(process.cwd(), "public", "uploads", name);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, buf);
  return `/uploads/${name}`;
}
