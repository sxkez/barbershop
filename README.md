# HANI BARBERSHOP — Website, Online-Booking & Kundenclub

German-language website for HANI BARBERSHOP, Höckinger Str. 1, 94405 Landau an der Isar.

- **Public site:** home, services & packages, online booking, product showcase (no shop), HANI merchandise, Kundenclub, about, contact, legal placeholders
- **Online booking:** 5-step flow, real availability (Mon & Tue from 1 Jan 2027, 10:00–19:00 Europe/Berlin), server-side re-validation, database-enforced double-booking prevention, confirmation e-mails with `.ics`, secure cancel/reschedule links
- **Admin (`/admin`):** dashboard, day/week calendar, booking actions (complete, no-show, cancel, reschedule, manual bookings), availability rules & closures, services/prices, products/photos, loyalty management, business settings, audit log
- **Kundenclub:** digital stamp card with QR code, admin-only stamping, corrections with mandatory reason, redemptions, paper-card migration, full audit trail

## Stack

Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · Supabase PostgreSQL + Auth + Storage · Resend · Zod · Vitest.
Local development and tests run the **same SQL migrations** on an embedded PostgreSQL ([PGlite](https://pglite.dev)), so no Docker or cloud account is needed to work on the project.

## Quick start (local)

```bash
npm install
cp .env.example .env.local      # set SESSION_SECRET and ADMIN_DEV_PASSWORD
npm run dev                     # http://localhost:3000  — database is created & seeded automatically in .data/pglite
npm test                        # 59 automated tests
```

Admin locally: open `/admin`, sign in with `ADMIN_DEV_PASSWORD` (dev only — disabled in production and whenever Supabase is configured).
Without `RESEND_API_KEY`, e-mails are written to the `email_outbox` table instead of being sent.

## Project structure

```
db/migrations/        SQL schema (tables, constraints, RLS)
db/seed.sql           initial non-sensitive data (services as price drafts, products, schedule)
docs/                 DEPLOYMENT.md, OWNER_HANDOVER.md, ASSETS.md
public/images/        real HANI photos, isolated product images, logo
scripts/              migrate.ts, create-admin.ts
src/app/(site)/       public pages
src/app/admin/        admin dashboard (+ server actions in admin/actions)
src/app/api/          booking, availability, manage, loyalty-link endpoints
src/lib/booking/      availability engine (pure) + booking service
src/lib/loyalty/      stamp ledger, redemptions, access links
src/lib/email/        Resend integration + German e-mail templates
tests/                Vitest suites (availability, booking DB, loyalty, admin auth)
```

## Key engineering decisions

| Concern | Approach |
| --- | --- |
| Double booking | `EXCLUDE USING gist (barber_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE status <> 'cancelled'` — the database rejects overlaps even under concurrent requests; cancelled bookings free their slot. |
| Availability | One pure engine (`src/lib/booking/availability.ts`) computes slots from rules, exceptions and existing bookings; the same code re-validates every booking on the server. |
| Time zones | Stored as UTC `timestamptz`; wall-clock rules are converted with `@date-fns/tz` (DST-safe, tested for the 2027 switches). |
| Idempotency | Client-generated idempotency keys (unique in DB) for bookings and loyalty actions. |
| Customer links | 256-bit random tokens, only SHA-256 hashes stored, expire at the end of the appointment / after 7 days. Booking references are never access keys. |
| Abuse | Postgres-backed rate limiting (hashed IPs), honeypot field, minimum fill time. |
| Data access | Server-only. All tables have RLS enabled with no public policies; the browser never talks to the database. |
| Prices | Seeded as drafts (`price_published = false`) → “Preis auf Anfrage” until the owner publishes them. |

See **docs/DEPLOYMENT.md** for production setup and **docs/OWNER_HANDOVER.md** for everything that needs the owner’s confirmation.
