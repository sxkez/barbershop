import { z } from "zod";
import { isLocalDate, isLocalTime } from "@/lib/time";

export const localDate = z.string().refine(isLocalDate, "Ungültiges Datum");
export const localTime = z.string().refine(isLocalTime, "Ungültige Uhrzeit");

const phoneRe = /^\+?[0-9 ()/\-]{6,24}$/;

export const customerFields = {
  fullName: z.string().trim().min(2, "Bitte gib deinen Namen an.").max(80, "Der Name ist zu lang."),
  phone: z.string().trim().regex(phoneRe, "Bitte gib eine gültige Telefonnummer an."),
  email: z.string().trim().toLowerCase().pipe(z.email("Bitte gib eine gültige E-Mail-Adresse an.")).pipe(z.string().max(160)),
};

export const bookingRequestSchema = z.object({
  serviceId: z.uuid(),
  date: localDate,
  time: localTime,
  ...customerFields,
  notes: z.string().trim().max(500, "Maximal 500 Zeichen.").optional().default(""),
  privacy: z.literal(true, { error: "Bitte bestätige die Datenschutzhinweise." }),
  joinLoyalty: z.boolean().optional().default(false),
  idempotencyKey: z.uuid(),
  // Spam protection
  website: z.string().max(0).optional().default(""), // honeypot — must stay empty
  startedAt: z.number().int().positive(),
});

export type BookingRequest = z.infer<typeof bookingRequestSchema>;

export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
