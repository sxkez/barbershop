-- HANI BARBERSHOP — initial schema
-- Runs on Supabase PostgreSQL (production) and PGlite (local dev / tests).
-- All timestamps are stored in UTC (timestamptz); local display uses Europe/Berlin.

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type booking_status as enum ('confirmed', 'cancelled', 'completed', 'no_show');
create type loyalty_tx_type as enum ('stamp', 'correction', 'redemption', 'migration');
create type exception_kind as enum ('closed', 'break', 'extra_open');
create type admin_role as enum ('owner', 'admin', 'staff');

-- ---------------------------------------------------------------------------
-- Admins (linked to Supabase Auth users by user_id; no FK so the schema also
-- runs outside Supabase). There is no public sign-up: rows are created by the
-- owner via the seed script / SQL editor.
-- ---------------------------------------------------------------------------
create table admin_profiles (
  user_id      uuid primary key,
  email        text not null unique,
  display_name text not null default '',
  role         admin_role not null default 'admin',
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Business settings (single row)
-- ---------------------------------------------------------------------------
create table business_settings (
  id                         smallint primary key default 1 check (id = 1),
  name                       text not null default 'HANI BARBERSHOP',
  street                     text not null default '',
  postal_code                text not null default '',
  city                       text not null default '',
  phone                      text not null default '',
  email                      text,
  timezone                   text not null default 'Europe/Berlin',
  -- [{ "days": "Mo–Sa", "hours": "10:00–19:00" }] ; display only
  walk_in_hours              jsonb not null default '[]'::jsonb,
  walk_in_note               text,
  walk_in_confirmed          boolean not null default false,
  booking_enabled            boolean not null default true,
  booking_start_date         date not null default '2027-01-01',
  slot_interval_minutes      integer not null default 30 check (slot_interval_minutes between 5 and 120),
  min_notice_minutes         integer not null default 120 check (min_notice_minutes >= 0),
  max_advance_days           integer not null default 90 check (max_advance_days between 1 and 730),
  cancellation_notice_minutes integer not null default 720 check (cancellation_notice_minutes >= 0),
  maps_url                   text,
  google_review_url          text,
  social_links               jsonb not null default '[]'::jsonb,
  email_from                 text,
  email_reply_to             text,
  loyalty_enabled            boolean not null default true,
  loyalty_stamps_required    integer not null default 10 check (loyalty_stamps_required between 1 and 50),
  loyalty_reward_text        text,
  loyalty_reward_confirmed   boolean not null default false,
  loyalty_auto_stamp_on_complete boolean not null default false,
  loyalty_physical_mode      text not null default 'manual_migration'
                               check (loyalty_physical_mode in ('manual_migration', 'separate')),
  updated_at                 timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Barbers (one today, many later)
-- ---------------------------------------------------------------------------
create table barbers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  active     boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Services
-- ---------------------------------------------------------------------------
create table service_categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  sort_order integer not null default 0
);

create table services (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  category_id      uuid references service_categories(id) on delete set null,
  name             text not null,
  description      text,
  includes         text,
  price_cents      integer check (price_cents is null or price_cents >= 0),
  price_published  boolean not null default false,
  compare_at_cents integer check (compare_at_cents is null or compare_at_cents >= 0),
  duration_minutes integer not null default 30 check (duration_minutes between 5 and 480),
  online_bookable  boolean not null default false,
  is_package       boolean not null default false,
  featured         boolean not null default false,
  active           boolean not null default true,
  archived_at      timestamptz,
  image_path       text,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- a published price must exist
  constraint price_published_requires_price check (not price_published or price_cents is not null)
);
create index services_sort_idx on services (sort_order);

-- ---------------------------------------------------------------------------
-- Availability
-- weekday: ISO 1 = Monday … 7 = Sunday. Times are local (Europe/Berlin) wall-clock.
-- barber_id null = applies to all barbers.
-- ---------------------------------------------------------------------------
create table availability_rules (
  id          uuid primary key default gen_random_uuid(),
  barber_id   uuid references barbers(id) on delete cascade,
  weekday     smallint not null check (weekday between 1 and 7),
  start_time  time not null,
  end_time    time not null,
  valid_from  date,
  valid_until date,
  created_at  timestamptz not null default now(),
  check (end_time > start_time),
  check (valid_until is null or valid_from is null or valid_until >= valid_from)
);

create table availability_exceptions (
  id         uuid primary key default gen_random_uuid(),
  barber_id  uuid references barbers(id) on delete cascade,
  date       date not null,
  start_time time,           -- null + null = whole day
  end_time   time,
  kind       exception_kind not null,
  reason     text,
  created_at timestamptz not null default now(),
  check ((start_time is null) = (end_time is null)),
  check (start_time is null or end_time > start_time),
  check (kind <> 'extra_open' or start_time is not null)
);
create index availability_exceptions_date_idx on availability_exceptions (date);

-- ---------------------------------------------------------------------------
-- Customers & bookings
-- ---------------------------------------------------------------------------
create table customers (
  id                  uuid primary key default gen_random_uuid(),
  full_name           text not null,
  email               text not null,
  phone               text not null,
  privacy_accepted_at timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  anonymized_at       timestamptz
);
create unique index customers_email_key on customers (lower(email)) where anonymized_at is null;

create table bookings (
  id                    uuid primary key default gen_random_uuid(),
  reference             text not null unique,
  barber_id             uuid not null references barbers(id),
  service_id            uuid references services(id) on delete set null,
  customer_id           uuid not null references customers(id),
  starts_at             timestamptz not null,
  ends_at               timestamptz not null,
  status                booking_status not null default 'confirmed',
  -- contact details as given for this appointment (customer row is only matched by e-mail)
  contact_name          text not null,
  contact_email         text not null,
  contact_phone         text not null,
  service_name          text not null,
  price_cents           integer,
  duration_minutes      integer not null check (duration_minutes > 0),
  notes                 text,
  source                text not null default 'online' check (source in ('online', 'admin')),
  manage_token_hash     text unique,
  manage_token_expires_at timestamptz,
  idempotency_key       text unique,
  cancelled_at          timestamptz,
  cancel_reason         text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Database-enforced double-booking prevention. Cancelled appointments free their slot.
  constraint bookings_no_overlap exclude using gist (
    barber_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status <> 'cancelled')
);
create index bookings_starts_idx on bookings (starts_at);
create index bookings_customer_idx on bookings (customer_id);

-- ---------------------------------------------------------------------------
-- Products & merchandise (showcase only — no cart, no checkout)
-- ---------------------------------------------------------------------------
create table product_categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  kind       text not null default 'product' check (kind in ('product', 'merch')),
  sort_order integer not null default 0
);

create table products (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  category_id  uuid references product_categories(id) on delete set null,
  brand        text,
  name         text not null,
  variant      text,
  size_label   text,
  scent        text,
  strength     text,
  description  text,
  details_confirmed boolean not null default false,
  image_path   text,
  image_alt    text,
  photo_note   text,
  visible      boolean not null default true,
  featured     boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index products_sort_idx on products (sort_order);

-- ---------------------------------------------------------------------------
-- Loyalty (Kundenclub)
-- ---------------------------------------------------------------------------
create table loyalty_accounts (
  id                   uuid primary key default gen_random_uuid(),
  customer_id          uuid not null unique references customers(id),
  card_code            text not null unique,      -- opaque code shown as QR in the shop
  stamps               integer not null default 0 check (stamps >= 0),
  physical_card_linked boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table loyalty_rewards (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references loyalty_accounts(id),
  stamps_used   integer not null check (stamps_used > 0),
  reward_text   text,
  admin_user_id uuid,
  created_at    timestamptz not null default now()
);

create table loyalty_transactions (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references loyalty_accounts(id),
  type            loyalty_tx_type not null,
  delta           integer not null check (delta <> 0),
  balance_after   integer not null check (balance_after >= 0),
  reason          text,
  booking_id      uuid references bookings(id),
  reward_id       uuid references loyalty_rewards(id),
  admin_user_id   uuid,
  idempotency_key text unique,
  created_at      timestamptz not null default now(),
  check (type <> 'correction' or (reason is not null and length(trim(reason)) > 0)),
  check (type <> 'redemption' or reward_id is not null)
);
-- A booking can earn at most one stamp.
create unique index loyalty_tx_booking_stamp_key on loyalty_transactions (booking_id)
  where type = 'stamp' and booking_id is not null;
create index loyalty_tx_account_idx on loyalty_transactions (account_id, created_at desc);

-- One-time / expiring links for customers (loyalty card access)
create table customer_access_tokens (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  token_hash  text not null unique,
  purpose     text not null check (purpose in ('loyalty')),
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Operations
-- ---------------------------------------------------------------------------
create table audit_logs (
  id          bigint generated always as identity primary key,
  actor_type  text not null check (actor_type in ('admin', 'customer', 'system')),
  actor_id    text,
  action      text not null,
  entity      text not null,
  entity_id   text,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index audit_logs_entity_idx on audit_logs (entity, entity_id);
create index audit_logs_created_idx on audit_logs (created_at desc);

create table rate_limits (
  key          text not null,
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (key, window_start)
);

create table email_outbox (
  id          uuid primary key default gen_random_uuid(),
  to_email    text not null,
  subject     text not null,
  template    text not null,
  status      text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'logged')),
  provider_id text,
  error       text,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz
);

-- ---------------------------------------------------------------------------
-- Row Level Security: every table is locked down. The website talks to the
-- database only from the server (privileged connection), never from the
-- browser, so no anon/authenticated policies are granted.
-- ---------------------------------------------------------------------------
alter table admin_profiles          enable row level security;
alter table business_settings       enable row level security;
alter table barbers                 enable row level security;
alter table service_categories      enable row level security;
alter table services                enable row level security;
alter table availability_rules      enable row level security;
alter table availability_exceptions enable row level security;
alter table customers               enable row level security;
alter table bookings                enable row level security;
alter table product_categories      enable row level security;
alter table products                enable row level security;
alter table loyalty_accounts        enable row level security;
alter table loyalty_rewards         enable row level security;
alter table loyalty_transactions    enable row level security;
alter table customer_access_tokens  enable row level security;
alter table audit_logs              enable row level security;
alter table rate_limits             enable row level security;
alter table email_outbox            enable row level security;
