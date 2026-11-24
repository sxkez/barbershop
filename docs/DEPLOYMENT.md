# Deployment (Vercel + Supabase + Resend)

## 1. Supabase

1. Create a project (region **EU – Frankfurt** recommended).
2. **Database → SQL**: nothing to paste manually — migrations run from your machine (step 4).
3. **Authentication → Providers → Email**: keep e-mail/password, **disable “Allow new users to sign up”** (there is no public admin registration).
4. **Authentication → Users → Add user**: create the owner’s login (e-mail + strong password).
5. **Storage**: create a **public** bucket named `media` (product/service photo uploads). Uploads are made server-side with the service role key; file type is verified by content (JPG/PNG/WebP, ≤ 5 MB).
6. Copy from **Project Settings**:
   - Database → connection string (Transaction pooler, port 6543) → `DATABASE_URL`
   - API → Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - API → publishable/anon key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - API → service role key → `SUPABASE_SERVICE_ROLE_KEY` (server only!)

## 2. Migrate & seed

```bash
# with the production values exported in your shell or in .env.production.local
DATABASE_URL="postgresql://…" npm run db:seed          # migrations + initial data (only if empty)
npm run admin:create -- owner@example.de "Hani" owner  # grants /admin access to the Supabase user
```

Later schema changes: add a new file `db/migrations/0002_….sql` and run `npm run db:migrate`.

## 3. Resend (e-mail)

1. Add and verify the sending domain (DNS records).
2. Create an API key → `RESEND_API_KEY`.
3. `EMAIL_FROM="HANI BARBERSHOP <termine@your-domain.de>"`.

## 4. Vercel

1. Import the repository. Framework: Next.js (defaults).
2. Set all variables from `.env.example` (Production + Preview). **Do not** set `ADMIN_DEV_PASSWORD` in production.
3. `SITE_URL` = final domain (used in e-mails, sitemap, Open Graph).
4. Deploy, then add the custom domain.

## 5. Launch checklist

- [ ] `npm test` green, `npm run build` green
- [ ] Owner confirmed prices & durations and published them in `/admin/leistungen`
- [ ] Owner confirmed walk-in hours, Paket 3 contents, Kundenclub reward (`/admin/einstellungen`)
- [ ] Impressum & Datenschutz completed and reviewed → set `LEGAL_TEXTS_REVIEWED=true`
- [ ] Google review link + social media URLs entered (only verified links)
- [ ] Test booking on production: confirmation e-mail arrives, manage link works, slot disappears, cancel reopens it
- [ ] Admin login works; a non-admin Supabase user is rejected
- [ ] Supabase: sign-ups disabled, backups enabled (Point-in-Time Recovery if on a paid plan)
- [ ] Search Console: submit `https://<domain>/sitemap.xml`

## Data retention (suggested — owner to decide)

- Bookings & contact data: delete or anonymise 12 months after the appointment (`customers.anonymized_at`, clear contact fields on `bookings`).
- `rate_limits`: auto-pruned (entries older than 24 h).
- `email_outbox`: contains recipient + subject only (no bodies); prune after 90 days.
- `audit_logs`: keep 24 months.
A scheduled job (Supabase cron / pg_cron) can run these deletions; it is intentionally not enabled until the owner has decided on retention periods.
