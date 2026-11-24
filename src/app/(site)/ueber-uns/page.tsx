import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { SectionHeading } from "@/components/site/ui";
import { Reveal } from "@/components/site/Reveal";
import theke from "../../../../public/images/shop/theke-led.webp";
import visitenkarte from "../../../../public/images/merch/visitenkarte-blau.webp";
import regal from "../../../../public/images/shop/regal-wachs.webp";

export const metadata: Metadata = {
  title: "Über uns",
  description: "HANI BARBERSHOP in der Höckinger Straße in Landau an der Isar – Haarschnitt, Bart und Styling.",
  alternates: { canonical: "/ueber-uns" },
};

/*
 * OWNER: The story text below is intentionally short and factual. Replace it with
 * the real HANI story (founding year, team, background) — see docs/OWNER_HANDOVER.md.
 */
export default function AboutPage() {
  return (
    <div className="container-page pt-14 md:pt-20">
      <SectionHeading as="h1" eyebrow="HANI Barbershop" title="Über uns" />
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <div className="space-y-5 text-lg leading-relaxed text-fg/85">
            <p>
              <strong className="text-fg">HANI BARBERSHOP</strong> steht für drei Dinge: <strong className="text-fg">Haarschnitt, Bart und Styling</strong>. Mitten in
              Landau an der Isar, in der Höckinger Straße 1.
            </p>
            <p>
              Bei uns kannst du einfach vorbeikommen – ohne Termin, Mittwoch bis Samstag. Ab Januar 2027 sind Montag und Dienstag für feste Termine reserviert,
              die du bequem online buchst.
            </p>
            <p>Im Laden findest du außerdem ausgewählte Styling- und Pflegeprodukte von Bandido – frag uns, was zu deinem Haar passt.</p>
          </div>
          <Link href="/termin" className="btn btn-primary mt-8">
            <CalendarDays className="size-5" aria-hidden /> Termin buchen
          </Link>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="grid grid-cols-5 gap-4">
            <Image src={theke} alt="Blau beleuchtete Theke im HANI Barbershop" placeholder="blur" className="col-span-5 h-auto w-full rounded-2xl border border-line" sizes="(min-width:1024px) 45vw, 100vw" />
            <Image src={regal} alt="Produktregal mit Bandido Aqua Wax und Colognes" placeholder="blur" className="col-span-3 h-full w-full rounded-2xl border border-line object-cover" sizes="(min-width:1024px) 27vw, 60vw" />
            <Image src={visitenkarte} alt="HANI Barbershop Visitenkarte: Ohne Terminvereinbarung, Mo–Sa 10–19 Uhr" placeholder="blur" className="col-span-2 h-full w-full rounded-2xl border border-line object-cover" sizes="(min-width:1024px) 18vw, 40vw" />
          </div>
        </Reveal>
      </div>
    </div>
  );
}
