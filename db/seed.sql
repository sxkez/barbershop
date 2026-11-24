-- HANI BARBERSHOP — initial, non-sensitive seed data.
-- Safe to run once on an empty database. Contains no customer records.
--
-- OWNER CONFIRMATION REQUIRED (see docs/OWNER_HANDOVER.md):
--   * Prices below were transcribed from the shop's price-board screen.
--     They are stored as DRAFTS (price_published = false). The website shows
--     "Preis auf Anfrage" until the owner publishes each price in /admin.
--   * Durations default to 30 minutes until the owner sets real durations.
--   * Walk-in hours come from the printed business card (walk_in_confirmed = false).

insert into business_settings (
  id, name, street, postal_code, city, phone, timezone,
  walk_in_hours, walk_in_note, walk_in_confirmed,
  booking_start_date, slot_interval_minutes, min_notice_minutes, max_advance_days,
  cancellation_notice_minutes, maps_url, social_links,
  loyalty_stamps_required, loyalty_reward_text, loyalty_reward_confirmed
) values (
  1, 'HANI BARBERSHOP', 'Höckinger Str. 1', '94405', 'Landau an der Isar', '+49 179 6938275', 'Europe/Berlin',
  '[{"days": "Montag – Samstag", "hours": "10:00 – 19:00 Uhr"}, {"days": "Sonntag", "hours": "geschlossen"}]'::jsonb,
  'Ab Januar 2027 sind Montag und Dienstag nur mit Termin. Mittwoch bis Samstag: einfach ohne Termin vorbeikommen.',
  false,
  '2027-01-01', 30, 120, 90,
  720,
  'https://www.google.com/maps/dir/?api=1&destination=H%C3%B6ckinger%20Str.%201%2C%2094405%20Landau%20an%20der%20Isar',
  '[{"network": "facebook", "label": "HANI BARBERSHOP", "url": null}, {"network": "tiktok", "label": "HANI BARBERSHOP", "url": null}]'::jsonb,
  10, 'Sammle 10 Stempel und erhalte deine Belohnung.', false
) on conflict (id) do nothing;

insert into barbers (name, sort_order) values ('Hani', 0);

-- Online booking: Monday & Tuesday, 10:00–19:00 local time, from 1 January 2027.
insert into availability_rules (barber_id, weekday, start_time, end_time, valid_from)
values (null, 1, '10:00', '19:00', '2027-01-01'),
       (null, 2, '10:00', '19:00', '2027-01-01');

-- ---------------------------------------------------------------------------
-- Services
-- ---------------------------------------------------------------------------
insert into service_categories (slug, name, sort_order) values
  ('pakete', 'Pakete', 0),
  ('haare', 'Haare', 1),
  ('bart', 'Bart', 2),
  ('gesicht', 'Gesicht & Pflege', 3);

insert into services (slug, category_id, name, description, includes, price_cents, compare_at_cents, duration_minutes,
                      online_bookable, is_package, featured, sort_order)
values
  ('paket-1-classic',  (select id from service_categories where slug = 'pakete'), 'Paket 1 – Classic',
     'Der Klassiker: frischer Haarschnitt und Bartrasur.', 'Haarschnitt + Bart rasieren', 3200, 3600, 30, true, true, true, 10),
  ('paket-2-premium',  (select id from service_categories where slug = 'pakete'), 'Paket 2 – Premium',
     'Haarschnitt, Bart und Augenbrauen in einem Termin.', 'Haarschnitt + Bart + Augenbrauen', 3900, 4400, 30, true, true, true, 20),
  ('paket-3-komplett', (select id from service_categories where slug = 'pakete'), 'Paket 3 – Komplett',
     'Das Rundum-Paket.', 'Haarschnitt + Bart + Augenbrauen', 4800, 5400, 30, true, true, true, 30),
  ('haarschnitt',        (select id from service_categories where slug = 'haare'), 'Haarschnitt', null, null, 2200, null, 30, true, false, false, 100),
  ('kinderhaarschnitt',  (select id from service_categories where slug = 'haare'), 'Kinderhaarschnitt', 'Für Kinder bis 12 Jahre.', null, 1600, null, 30, true, false, false, 110),
  ('waschen-schneiden-foehnen', (select id from service_categories where slug = 'haare'), 'Waschen, Schneiden, Föhnen', null, null, 2500, null, 30, true, false, false, 120),
  ('waschen-stylen',     (select id from service_categories where slug = 'haare'), 'Waschen & Stylen', null, null, 1000, null, 30, true, false, false, 130),
  ('bart-rasieren',      (select id from service_categories where slug = 'bart'), 'Bart rasieren', null, null, 1400, null, 30, true, false, false, 200),
  ('bart-trimmen',       (select id from service_categories where slug = 'bart'), 'Bart trimmen', null, null, null, null, 30, false, false, false, 210),
  ('augenbrauen-zupfen', (select id from service_categories where slug = 'gesicht'), 'Augenbrauen zupfen', null, null, 800, null, 30, false, false, false, 300),
  ('gesicht-wachs',      (select id from service_categories where slug = 'gesicht'), 'Komplettes Gesicht mit Wachs', null, null, 1000, null, 30, false, false, false, 310),
  ('ohren-wachs',        (select id from service_categories where slug = 'gesicht'), 'Ohren mit Wachs', null, null, 400, null, 30, false, false, false, 320),
  ('nase-wachs',         (select id from service_categories where slug = 'gesicht'), 'Nase mit Wachs', null, null, 400, null, 30, false, false, false, 330);

-- ---------------------------------------------------------------------------
-- Products (showcase only). Details are limited to what is printed on the
-- packaging in the supplied shop photos; details_confirmed = false until the
-- owner verifies them.
-- ---------------------------------------------------------------------------
insert into product_categories (slug, name, kind, sort_order) values
  ('styling-wax', 'Styling Wax', 'product', 0),
  ('styling-powder', 'Styling Powder', 'product', 1),
  ('hair-spray', 'Hair Spray', 'product', 2),
  ('hair-tonic', 'Hair Tonic', 'product', 3),
  ('cologne', 'Cologne', 'product', 4),
  ('beard-care', 'Beard Care', 'product', 5),
  ('grooming', 'Weitere Pflege', 'product', 6),
  ('merch', 'HANI Merchandise', 'merch', 10);

insert into products (slug, category_id, brand, name, variant, size_label, scent, strength, description, image_path, image_alt, photo_note, featured, sort_order)
values
  ('bandido-aqua-wax', (select id from product_categories where slug = 'styling-wax'), 'Bandido', 'Aqua Wax', 'Sorten 4, 5, 6 & 8', null, null, null,
     'Wasserbasiertes Styling-Wachs von Bandido. Im Shop in mehreren Sorten erhältlich.',
     '/images/products/bandido-aqua-wax-official.webp', 'Bandido Aqua Wax Dosen in Grün (4), Blau (5), Lila (6) und Schwarz (8)', 'Offizielles Produktbild von Bandido (Nutzung vom Hersteller genehmigt).', true, 10),
  ('bandido-hair-styling-powder', (select id from product_categories where slug = 'styling-powder'), 'Bandido', 'Hair Styling Powder', 'Skull Edition', null, null, null,
     'Styling-Puder in der Totenkopf-Verpackung. Laut Verpackung: „Powerful Structure – Shiny – Styling Revolution“.',
     '/images/products/bandido-skull-wax.webp', 'Bandido Styling-Produkt im Karton mit grünem Totenkopf', 'Produktbild aus der bereitgestellten Collage.', true, 20),
  ('bandido-hair-spray-extra-volume', (select id from product_categories where slug = 'hair-spray'), 'Bandido', 'Hair Spray Extra Volume', 'Extremely – Stufe 8', '400 ml', null, '8',
     'Haarspray für extra Volumen aus der Bandido-Reihe.',
     '/images/products/bandido-hair-spray-extra-volume-official.webp', 'Silberne Dose Bandido Hair Spray Extra Volume', 'Offizielles Produktbild von Bandido (Nutzung vom Hersteller genehmigt).', true, 30),
  ('bandido-sea-salt-spray', (select id from product_categories where slug = 'hair-spray'), 'Bandido', 'Sea Salt Spray', null, null, null, null,
     'Meersalz-Spray für Textur.',
     '/images/products/bandido-sea-salt-spray-official.webp', 'Bandido Sea Salt Spray, graue Flasche mit türkisem Etikett', 'Offizielles Produktbild von Bandido (Nutzung vom Hersteller genehmigt).', false, 40),
  ('bandido-tonic-grooming', (select id from product_categories where slug = 'hair-tonic'), 'Bandido', 'Tonic Grooming', 'Nr. 9', null, null, null,
     'Haarwasser aus der Bandido-Reihe.',
     '/images/products/bandido-tonic-grooming-official.webp', 'Bandido Tonic Grooming, gelbe Flasche', 'Offizielles Produktbild von Bandido (Nutzung vom Hersteller genehmigt).', false, 50),
  ('bandido-cologne-lemon', (select id from product_categories where slug = 'cologne'), 'Bandido', 'Cologne Lemon', 'Nr. 3', '150 ml', 'Lemon', null,
     'Exclusive Cologne / After Shave.',
     '/images/products/bandido-cologne-lemon-official.webp', 'Bandido Cologne Lemon, gelbe Flasche', 'Offizielles Produktbild von Bandido (Nutzung vom Hersteller genehmigt).', true, 60),
  ('bandido-cologne-las-vegas', (select id from product_categories where slug = 'cologne'), 'Bandido', 'Cologne Las Vegas', 'Nr. 1', '150 ml', 'Las Vegas', null,
     'Exclusive Cologne / After Shave.',
     '/images/products/bandido-cologne-las-vegas-official.webp', 'Bandido Cologne Las Vegas, bernsteinfarbene Flasche', 'Offizielles Produktbild von Bandido (Nutzung vom Hersteller genehmigt).', false, 61),
  ('bandido-cologne-moscow', (select id from product_categories where slug = 'cologne'), 'Bandido', 'Cologne Moscow', 'Nr. 2', '150 ml', 'Moscow', null,
     'Exclusive Cologne / After Shave.',
     '/images/products/bandido-cologne-moscow-official.webp', 'Bandido Cologne Moscow, violette Flasche', 'Offizielles Produktbild von Bandido (Nutzung vom Hersteller genehmigt).', false, 62),
  ('bandido-cologne-berlin', (select id from product_categories where slug = 'cologne'), 'Bandido', 'Cologne Berlin', 'Nr. 6', '150 ml', 'Berlin', null,
     'Exclusive Cologne / After Shave.',
     '/images/products/bandido-cologne-berlin-official.webp', 'Bandido Cologne Berlin, blaue Flasche', 'Offizielles Produktbild von Bandido (Nutzung vom Hersteller genehmigt).', true, 63),
  ('bandido-cologne-sydney', (select id from product_categories where slug = 'cologne'), 'Bandido', 'Cologne Sydney', 'Nr. 7', '150 ml', 'Sydney', null,
     'Exclusive Cologne / After Shave.',
     '/images/products/bandido-cologne-sydney-official.webp', 'Bandido Cologne Sydney, grüne Flasche', 'Offizielles Produktbild von Bandido (Nutzung vom Hersteller genehmigt).', true, 64),
  ('bandido-beard-oil-rose', (select id from product_categories where slug = 'beard-care'), 'Bandido', 'Beard Oil Rose', 'Limited Edition', null, 'Rose', null,
     'Bartöl in der limitierten Rose-Edition.',
     '/images/products/bandido-beard-oil-rose.webp', 'Bandido Beard Oil Rose in gestreifter Röhre', 'Produktbild aus der bereitgestellten Collage.', true, 70),
  ('bandido-luxury-barber-powder', (select id from product_categories where slug = 'grooming'), 'Bandido', 'Luxury Barber Powder', null, '260 g', null, null,
     'Barber-Puder. Laut Verpackung: stark saugfähig, nimmt überschüssige Feuchtigkeit auf und glättet die Haut.',
     '/images/products/bandido-luxury-barber-powder-official.webp', 'Schwarze Flasche Bandido Luxury Barber Powder', 'Offizielles Produktbild von Bandido (Nutzung vom Hersteller genehmigt).', true, 80),
  ('hani-kugelschreiber', (select id from product_categories where slug = 'merch'), 'HANI', 'HANI Barbershop Kugelschreiber', null, null, null, null,
     'Blauer Kugelschreiber mit HANI BARBERSHOP Aufdruck.',
     '/images/merch/kugelschreiber.webp', 'Blauer Kugelschreiber mit Aufdruck HANI BARBERSHOP in der Hand', 'Original-Foto.', false, 200),
  ('hani-auto-duftanhaenger', (select id from product_categories where slug = 'merch'), 'HANI', 'HANI Auto-Duftanhänger', null, null, null, null,
     'Duftanhänger fürs Auto im HANI-Design.',
     '/images/merch/duftanhaenger.webp', 'HANI Barbershop Auto-Duftanhänger in Verpackung', 'Original-Foto.', false, 210);
