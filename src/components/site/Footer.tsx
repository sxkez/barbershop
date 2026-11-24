import Link from "next/link";
import { Clock, MapPin, Navigation, Phone } from "lucide-react";
import { Logo } from "./Logo";
import { NAV } from "./nav";
import type { BusinessSettings } from "@/lib/settings";
import { telHref } from "@/lib/format";

export function Footer({ settings }: { settings: BusinessSettings }) {
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-24 border-t border-line bg-[#04070b]">
      <div className="brand-rule absolute inset-x-0 top-0 h-[2px] rounded-none opacity-70" />
      <div className="container-page grid gap-12 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-5">
          <Logo className="w-[190px]" />
          <p className="max-w-xs text-sm leading-relaxed text-muted">Haarschnitt · Bart · Styling — in Landau an der Isar.</p>
        </div>

        <div>
          <h2 className="eyebrow mb-4">Besuch uns</h2>
          <address className="space-y-3 text-sm not-italic text-fg/90">
            <p className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-blue-soft" aria-hidden />
              <span>
                {settings.street}
                <br />
                {settings.postalCode} {settings.city}
              </span>
            </p>
            <p className="flex gap-3">
              <Phone className="mt-0.5 size-4 shrink-0 text-blue-soft" aria-hidden />
              <a href={telHref(settings.phone)} className="hover:text-blue-soft">
                {settings.phone}
              </a>
            </p>
            {settings.mapsUrl && (
              <a href={settings.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-blue-soft hover:underline">
                <Navigation className="size-4" aria-hidden /> Route planen
              </a>
            )}
          </address>
        </div>

        <div>
          <h2 className="eyebrow mb-4">Öffnungszeiten</h2>
          <ul className="space-y-2 text-sm">
            {settings.walkInHours.map((h) => (
              <li key={h.days} className="flex gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-blue-soft" aria-hidden />
                <span>
                  <span className="text-fg/90">{h.days}</span>
                  <br />
                  <span className="text-muted">{h.hours}</span>
                </span>
              </li>
            ))}
          </ul>
          {settings.walkInNote && <p className="mt-4 text-xs leading-relaxed text-muted">{settings.walkInNote}</p>}
        </div>

        <nav aria-label="Footer">
          <h2 className="eyebrow mb-4">Navigation</h2>
          <ul className="grid grid-cols-2 gap-2 text-sm lg:grid-cols-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="text-fg/80 hover:text-fg">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <div
          className="container-page flex flex-col gap-3 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        >
          <p>© {year} HANI BARBERSHOP</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li>
              <Link href="/impressum" className="hover:text-fg">Impressum</Link>
            </li>
            <li>
              <Link href="/datenschutz" className="hover:text-fg">Datenschutz</Link>
            </li>
            <li>
              <Link href="/admin" className="hover:text-fg" rel="nofollow">Admin</Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
