import "server-only";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { BookingError } from "@/lib/booking/service";
import { LoyaltyError } from "@/lib/loyalty/service";

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

const STATUS: Record<string, number> = {
  SERVICE_UNAVAILABLE: 422,
  SLOT_UNAVAILABLE: 409,
  SLOT_TAKEN: 409,
  NOT_FOUND: 404,
  TOO_LATE: 422,
  INVALID_STATE: 409,
  IDEMPOTENCY_CONFLICT: 409,
  INSUFFICIENT_STAMPS: 422,
  INVALID: 422,
  DISABLED: 422,
  DUPLICATE: 409,
};

export function errorResponse(err: unknown) {
  if (err instanceof BookingError || err instanceof LoyaltyError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: STATUS[err.code] ?? 400 });
  }
  console.error("[api] unexpected error", err instanceof Error ? err.message : err);
  return NextResponse.json({ error: "Es ist ein Fehler aufgetreten. Bitte versuche es erneut oder ruf uns an." }, { status: 500 });
}

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) } });
}
