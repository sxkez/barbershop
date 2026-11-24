# Übergabe an den Inhaber – HANI BARBERSHOP

## Bitte bestätigen bzw. ergänzen (vor dem Livegang)

| Thema | Aktueller Stand | Wo ändern |
| --- | --- | --- |
| **Preise** | Aus dem Preis-Bildschirm übernommen, aber als **Entwurf** gespeichert. Öffentlich steht „Preis auf Anfrage“. | Admin → Leistungen → „Preis veröffentlichen“ |
| **Dauer pro Leistung** | Alle 30 Minuten (Standard). Pakete dauern evtl. länger. | Admin → Leistungen |
| **Paket 3 – Komplett** | Laut Preisbild „Haarschnitt + Bart + Augenbrauen“ – identisch mit Paket 2, aber teurer. Bitte genauen Inhalt angeben. | Admin → Leistungen |
| **Online buchbare Leistungen** | Pakete 1–3, Haarschnitt, Kinderhaarschnitt, Waschen/Schneiden/Föhnen, Waschen & Stylen, Bart rasieren. Wachs-Behandlungen & Augenbrauen nur vor Ort. | Admin → Leistungen → „Online buchbar“ |
| **Öffnungszeiten ohne Termin** | Mo–Sa 10–19 Uhr (Visitenkarte); ab Jan. 2027 Mo & Di nur mit Termin. | Admin → Einstellungen |
| **Kundenclub-Belohnung** | „Sammle 10 Stempel und erhalte deine Belohnung.“ – konkrete Belohnung fehlt. | Admin → Einstellungen |
| **Papier-Stempelkarten** | Können manuell übertragen werden (Admin → Kundenclub → Karte → „Übertragen“). | Admin → Einstellungen |
| **Google-Bewertungslink** | Nicht eingetragen (wird erst dann angezeigt). | Admin → Einstellungen |
| **Facebook / TikTok** | Nur Namen bekannt („HANI BARBERSHOP“), keine Links. | Admin → Einstellungen |
| **E-Mail-Adresse** | Fehlt (Impressum, Antworten auf Bestätigungen). | Admin → Einstellungen |
| **Impressum & Datenschutz** | Platzhalter mit Hinweis „Entwurf“. Müssen fachkundig geprüft werden. | `src/app/(site)/impressum`, `…/datenschutz` |
| **„Über uns“-Text** | Kurz und sachlich. Gern echte Geschichte, Team, Gründungsjahr ergänzen. | `src/app/(site)/ueber-uns/page.tsx` |
| **Produktangaben** | Nur Angaben, die auf den Etiketten sichtbar sind. „Angaben bestätigt“ ist überall aus. | Admin → Produkte |

## Produktfotos – wichtig

**10 Produkte** nutzen die **offiziellen Produktbilder von Bandido** (bandidocosmetics.com). Bandido hat der Nutzung zugestimmt – bitte diese Zustimmung (E-Mail/Nachricht) aufbewahren. Betroffen: Aqua Wax, Hair Spray Extra Volume, Sea Salt Spray, Tonic Grooming, Luxury Barber Powder (260 g / 9.17 oz) und die Colognes Lemon, Las Vegas, Moscow, Berlin, Sydney.

Für **2 Produkte** gibt es kein offizielles Bild; sie nutzen noch Freisteller aus der bereitgestellten Produkt-**Collage**, die von der echten Verpackung abweicht:

- Beard Oil Rose: Collage „BEAND OIL“ (Schreibfehler); Totenkopf mit Sonnenbrille
- Skull-Produkt: Collage „Bandido Skull Wax“, echte Verpackung „Hair Styling Powder“

Für diese beiden am besten eigene Fotos machen oder Bandido nach Bildern fragen. Die Freisteller aus den Regalfotos liegen unter `public/images/products/original/`. Austausch jederzeit: Admin → Produkte → Produkt → „Neues Foto hochladen“. Am besten mit neuen Fotos vor neutralem Hintergrund.

Nicht verwendet (nicht sauber freistellbar oder nicht real): Bandido Styling Mousse (verdeckt im Regal), blaue Aqua-Wax-Dose 5 (Karton auf dem Deckel), Bandido-Duftanhänger und HANI-Schlüsselanhänger aus der Collage (nicht in den echten Fotos).

## Täglicher Ablauf im Admin

1. **Übersicht** – heutige Termine, Hinweise.
2. **Termine** – Kalender (Tag/Woche/Liste). Termin öffnen → „Als erledigt markieren“ / „Nicht erschienen“ / stornieren / verschieben.
3. **Termin anlegen** – für telefonische Buchungen.
4. **Verfügbarkeit** – Urlaub, Feiertage („Geschlossen“), Pausen oder Zusatztage.
5. **Kundenclub** – Kunde suchen (Name, E-Mail, Telefon oder Kartencode vom QR) → „+1 Stempel“. Belohnung einlösen zieht 10 Stempel ab. Korrekturen nur mit Begründung; alles wird protokolliert.

## Sicherheit

- Admin-Konten nur im Supabase-Dashboard anlegen und mit `npm run admin:create` freischalten. Mitarbeiter-Zugang später mit Rolle `staff` möglich.
- Kunden können sich keine Stempel selbst geben; Stempel gibt es nur im Admin.
- Kunden brauchen kein Konto: Termine werden über einen geheimen Link in der Bestätigungs-E-Mail verwaltet, die Stempelkarte über einen 7 Tage gültigen Link.
