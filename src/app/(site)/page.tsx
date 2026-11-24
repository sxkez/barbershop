import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, MapPin, Navigation, Phone, Scissors, Star, Store } from "lucide-react";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { listProducts, listServices } from "@/lib/catalog";
import { InfoBanner, PackageCard, ProductCard, SectionHeading } from "@/components/site/ui";
import { Reveal } from "@/components/site/Reveal";
import { DigitalCard } from "@/components/site/DigitalCard";
import { ShopGallery, type GalleryImage } from "@/components/site/ShopGallery";
import { telHref } from "@/lib/format";
import hero from "../../../public/images/shop/hero-theke.webp";
import stempelkarte from "../../../public/images/merch/stempelkarte.webp";

const GALLERY: GalleryImage[] = [
  {
    src: "/images/shop/innen-salon-total.webp",
    title: "Der Salon",
    caption: "Barberplätze unter der leuchtenden Wabendecke.",
    alt: "Blick in den HANI Barbershop mit blauen Wänden, Barberstühlen, Spiegeln und LED-Wabendecke",
  },
  {
    src: "/images/shop/innen-wartebereich.webp",
    title: "Wartebereich",
    caption: "Chesterfield-Sofa, großer Bildschirm und Konsole – Warten wird hier nicht langweilig.",
    alt: "Wartebereich mit blauem Chesterfield-Sofa, Fernseher und zwei Barberstühlen",
  },
  {
    src: "/images/shop/innen-theke-stuhl.webp",
    title: "Dein Platz",
    caption: "Barberstuhl, Theke mit HANI-Logo und die klassische Barber-Pole.",
    alt: "Barberstuhl mit rot-weiß-blauem Umhang vor der beleuchteten HANI-Theke und Produktregal",
  },
  {
    src: "/images/shop/innen-theke-regal.webp",
    title: "Theke & Produkte",
    caption: "Bandido-Pflege und Styling direkt zum Mitnehmen.",
    alt: "Beleuchtete Theke mit HANI-Wappen neben einem Regal voller Bandido-Produkte",
  },
  {
    src: "/images/shop/innen-weihnachtsbaum.webp",
    title: "Winter bei HANI",
    caption: "Zur Weihnachtszeit festlich geschmückt.",
    alt: "Weihnachtsbaum mit goldenen Kugeln im Vordergrund, dahinter der blaue Salon",
  },
];

export default async function HomePage() {
  const db = await getDb();
  const [settings, services, products] = await Promise.all([getSettings(db), listServices(db), listProducts(db, { kind: "product" })]);
  const packages = services.filter((s) => s.isPackage && s.featured).slice(0, 3);
  const featuredProducts = products.filter((p) => p.featured).slice(0, 8);

  return (
    <>
      {/* HERO */}
      <section className="relative isolate -mt-[72px] overflow-hidden pt-[72px] lg:-mt-[84px] lg:pt-[84px]">
        <Image src={hero} alt="" priority fill sizes="100vw" className="-z-20 object-cover object-center opacity-95" placeholder="blur" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#05080D_8%,rgba(5,8,13,0.78)_42%,rgba(5,8,13,0.15)_100%)]" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(5,8,13,0.2)_0%,rgba(5,8,13,0)_40%,#05080D_100%)]" />
        <div className="container-page flex min-h-[78svh] flex-col justify-center py-20 md:min-h-[640px] lg:min-h-[720px]">
          <Reveal>
            <p className="eyebrow text-fg/85 tracking-[0.55em]">HANI Barbershop</p>
            <h1 className="display mt-5 max-w-3xl text-[2.6rem] sm:text-6xl lg:text-7xl">
              Dein Barbershop <br className="hidden sm:block" />
              in Landau
            </h1>
            <div className="mt-7 flex max-w-md items-center" aria-hidden>
              <span className="h-[3px] w-1/2 rounded-l-full bg-blue" />
              <span className="h-[3px] w-1/2 rounded-r-full bg-red" />
            </div>
            <p className="mt-7 text-xs font-semibold uppercase tracking-[0.3em] text-fg/90 sm:text-sm sm:tracking-[0.45em]">Haarschnitt · Bart · Styling</p>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-fg/75 md:text-lg">
              Saubere Fades, klassische Schnitte und gepflegte Bärte in der Höckinger Straße. Mittwoch bis Samstag kommst du einfach vorbei, ab
              Januar 2027 buchst du Montag und Dienstag deinen festen Termin online.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/termin" className="btn btn-primary">
                <CalendarDays className="size-5" aria-hidden /> Termin buchen
              </Link>
              <Link href="/leistungen" className="btn btn-outline">
                Unsere Pakete
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section aria-label="Auf einen Blick" className="container-page relative z-10 -mt-6">
        <ul className="card grid divide-line sm:grid-cols-2 sm:divide-x-0 lg:grid-cols-4 lg:divide-x">
          {[
            { icon: Store, t: "Ohne Termin", d: "Mi – Sa einfach vorbeikommen" },
            { icon: CalendarDays, t: "Online-Termine", d: "Ab Jan. 2027 · Mo & Di" },
            { icon: Scissors, t: "Haare & Bart", d: "Schnitt, Rasur, Styling" },
            { icon: MapPin, t: "Landau a.d. Isar", d: settings.street },
          ].map(({ icon: Icon, t, d }) => (
            <li key={t} className="flex items-center gap-4 px-6 py-5">
              <Icon className="size-8 shrink-0 text-blue" strokeWidth={1.6} aria-hidden />
              <div>
                <p className="font-semibold">{t}</p>
                <p className="text-sm text-muted">{d}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* PACKAGES */}
      {packages.length > 0 && (
        <section className="container-page mt-24 md:mt-32" aria-labelledby="pakete">
          <Reveal>
            <SectionHeading id="pakete" title="Unsere Pakete" eyebrow="Leistungen" />
          </Reveal>
          <div className="grid gap-5 md:grid-cols-3">
            {packages.map((s, i) => (
              <Reveal key={s.id} delay={i * 0.08}>
                <PackageCard service={s} index={i} />
              </Reveal>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Link href="/leistungen" className="btn btn-outline">
              Alle Leistungen ansehen <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>
      )}

      <section className="container-page mt-20" aria-label="Termine und Walk-in">
        <Reveal>
          <InfoBanner />
        </Reveal>
      </section>

      {/* PRODUCTS */}
      {featuredProducts.length > 0 && (
        <section className="container-page mt-24 md:mt-32" aria-labelledby="produkte-heading">
          <Reveal>
            <SectionHeading
              id="produkte-heading"
              eyebrow="Im Shop erhältlich"
              title="Unsere Produkte"
              intro="Styling- und Pflegeprodukte von Bandido – direkt bei uns im Laden. Frag uns einfach, welches Produkt zu deinen Haaren passt."
            />
          </Reveal>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {featuredProducts.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 0.05}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Link href="/produkte" className="btn btn-outline">
              Alle Produkte ansehen <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>
      )}

      {/* KUNDENCLUB */}
      {settings.loyaltyEnabled && (
        <section className="container-page mt-24 md:mt-32" aria-labelledby="club">
          <div className="card glow-blue grid items-center gap-10 overflow-hidden p-6 md:p-10 lg:grid-cols-2 lg:p-14">
            <Reveal>
              <p className="eyebrow">Kundenclub</p>
              <h2 id="club" className="display mt-3 text-3xl md:text-5xl">
                Stempeln & sparen
              </h2>
              <p className="mt-5 max-w-lg leading-relaxed text-fg/80">
                Sammle Stempel bei deinen Besuchen – auf der klassischen Stempelkarte oder digital auf deinem Handy.{" "}
                {settings.loyaltyStampsRequired} Stempel gesammelt? Dann wartet deine Belohnung.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-fg/85">
                {["Papierkarte oder digitale Karte – du entscheidest", "Stempel werden nur im Shop vergeben", "QR-Code zum schnellen Stempeln an der Theke"].map((t) => (
                  <li key={t} className="flex gap-3">
                    <Star className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
              <Link href="/kundenclub" className="btn btn-primary mt-8">
                Mehr zum Kundenclub <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Reveal>
            <Reveal delay={0.1} className="relative">
              <div className="relative mx-auto max-w-md">
                <Image
                  src={stempelkarte}
                  alt="Die HANI Stempelkarte aus Papier: 10 Felder zum Sammeln, Bewertungs-QR-Code"
                  className="w-full rotate-[-4deg] rounded-xl shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)]"
                  sizes="(min-width: 1024px) 420px, 90vw"
                  placeholder="blur"
                />
                <div className="relative -mt-16 ml-auto w-[78%] rotate-[3deg] sm:-mt-20">
                  <DigitalCard stamps={7} required={settings.loyaltyStampsRequired} name="Dein Name" preview />
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* GALLERY */}
      <section className="container-page mt-24 md:mt-32" aria-labelledby="galerie">
        <Reveal>
          <SectionHeading id="galerie" eyebrow="Einblicke" title="Galerie" intro="Komm rein – so sieht es bei uns in der Höckinger Straße aus." />
        </Reveal>
        <ShopGallery images={GALLERY} />
      </section>

      {/* VISIT */}
      <section className="container-page mt-24 md:mt-32" aria-labelledby="besuch">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <div className="card p-6 md:p-10">
            <p className="eyebrow">Besuch uns</p>
            <h2 id="besuch" className="display mt-3 text-3xl md:text-4xl">
              Höckinger Str. 1
            </h2>
            <p className="mt-2 text-lg text-fg/80">
              {settings.postalCode} {settings.city}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {settings.mapsUrl && (
                <a href={settings.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                  <Navigation className="size-5" aria-hidden /> Route in Google Maps
                </a>
              )}
              <a href={telHref(settings.phone)} className="btn btn-ghost">
                <Phone className="size-5" aria-hidden /> {settings.phone}
              </a>
            </div>
          </div>
          <div className="card p-6 md:p-10">
            <p className="eyebrow">Öffnungszeiten</p>
            <ul className="mt-5 divide-y divide-line">
              {settings.walkInHours.map((h) => (
                <li key={h.days} className="flex items-center justify-between gap-4 py-3">
                  <span className="flex items-center gap-3 font-medium">
                    <Clock className="size-4 text-blue-soft" aria-hidden /> {h.days}
                  </span>
                  <span className="text-muted">{h.hours}</span>
                </li>
              ))}
            </ul>
            {settings.walkInNote && <p className="mt-5 rounded-xl border border-blue/30 bg-blue/5 p-4 text-sm leading-relaxed text-fg/85">{settings.walkInNote}</p>}
          </div>
        </div>
      </section>
    </>
  );
}
