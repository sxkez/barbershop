"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, Menu, Phone, X } from "lucide-react";
import { Logo } from "./Logo";
import { NAV } from "./nav";
import { cn, telHref } from "@/lib/format";

export function Header({ phone }: { phone: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const links = NAV.filter((n) => n.href !== "/termin");

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-colors duration-300",
        scrolled ? "border-b border-line/80 bg-ink/85 backdrop-blur-xl" : "border-b border-transparent bg-ink/40 backdrop-blur-sm",
      )}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-blue focus:px-4 focus:py-2">
        Zum Inhalt springen
      </a>
      <div className="container-page flex h-[72px] items-center gap-6 lg:h-[84px]">
        <Logo className="w-[150px] lg:w-[190px]" priority />
        <nav aria-label="Hauptnavigation" className="ml-auto hidden xl:block">
          <ul className="flex items-center gap-1">
            {links.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={isActive(n.href) ? "page" : undefined}
                  className={cn(
                    "relative rounded-lg px-3 py-2 text-[0.95rem] font-medium transition-colors",
                    isActive(n.href) ? "text-fg" : "text-fg/75 hover:text-fg",
                  )}
                >
                  {n.label}
                  {isActive(n.href) && <span className="absolute inset-x-3 -bottom-[3px] h-[3px] rounded-full bg-blue" />}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <Link
          href="/termin"
          className="btn btn-ghost ml-auto hidden border-blue/70 sm:inline-flex xl:ml-2"
          aria-current={pathname.startsWith("/termin") ? "page" : undefined}
        >
          <CalendarDays className="size-5 text-blue-soft" aria-hidden />
          Termin buchen
        </Link>
        <button
          type="button"
          className="btn btn-ghost ml-auto size-12 p-0 sm:ml-0 xl:hidden"
          aria-label="Menü öffnen"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen(true)}
        >
          <Menu className="size-6" aria-hidden />
        </button>
      </div>

      {open && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menü"
          className="fixed inset-0 z-50 flex flex-col bg-ink/98 backdrop-blur-xl xl:hidden"
          style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="container-page flex h-[72px] items-center">
            <Logo className="w-[150px]" />
            <button ref={closeRef} type="button" className="btn btn-ghost ml-auto size-12 p-0" aria-label="Menü schließen" onClick={() => setOpen(false)}>
              <X className="size-6" aria-hidden />
            </button>
          </div>
          <nav aria-label="Mobile Navigation" className="container-page mt-6 flex-1 overflow-y-auto">
            <ul className="space-y-1">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={isActive(n.href) ? "page" : undefined}
                    className={cn(
                      "display flex items-center justify-between rounded-xl px-3 py-3.5 text-2xl",
                      isActive(n.href) ? "bg-surface text-fg" : "text-fg/85 hover:bg-surface/60",
                    )}
                  >
                    {n.label}
                    {isActive(n.href) && <span className="h-2 w-2 rounded-full bg-blue" />}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="container-page grid gap-3 py-6">
            <Link href="/termin" className="btn btn-primary w-full">
              <CalendarDays className="size-5" aria-hidden /> Termin buchen
            </Link>
            <a href={telHref(phone)} className="btn btn-ghost w-full">
              <Phone className="size-5" aria-hidden /> {phone}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
