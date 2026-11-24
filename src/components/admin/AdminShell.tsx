"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CalendarClock, CalendarDays, LayoutDashboard, LogOut, Menu, Package, Scissors, ScrollText, Settings, Stamp, X } from "lucide-react";
import { logoutAction } from "@/app/admin/actions/auth";
import { cn } from "@/lib/format";
import logo from "../../../public/images/brand/hani-logo.png";

const NAV = [
  { href: "/admin", label: "Übersicht", icon: LayoutDashboard },
  { href: "/admin/termine", label: "Termine", icon: CalendarDays },
  { href: "/admin/verfuegbarkeit", label: "Verfügbarkeit", icon: CalendarClock },
  { href: "/admin/leistungen", label: "Leistungen", icon: Scissors },
  { href: "/admin/produkte", label: "Produkte", icon: Package },
  { href: "/admin/kundenclub", label: "Kundenclub", icon: Stamp },
  { href: "/admin/einstellungen", label: "Einstellungen", icon: Settings },
  { href: "/admin/protokoll", label: "Protokoll", icon: ScrollText },
];

export function AdminShell({ admin, children }: { admin: { name: string; role: string }; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const nav = (
    <nav aria-label="Admin-Navigation" className="flex flex-1 flex-col gap-1 p-3">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          aria-current={active(href) ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            active(href) ? "bg-blue/15 text-fg ring-1 ring-blue/40" : "text-fg/70 hover:bg-white/5 hover:text-fg",
          )}
        >
          <Icon className={cn("size-[18px]", active(href) ? "text-blue-soft" : "")} aria-hidden />
          {label}
        </Link>
      ))}
      <div className="mt-auto border-t border-line pt-3">
        <p className="px-3 text-xs text-muted">
          {admin.name} · {admin.role}
        </p>
        <form action={logoutAction}>
          <button className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-fg/70 hover:bg-white/5 hover:text-fg">
            <LogOut className="size-[18px]" aria-hidden /> Abmelden
          </button>
        </form>
        <Link href="/" className="mt-1 block px-3 py-2 text-xs text-muted hover:text-fg">
          → Zur Website
        </Link>
      </div>
    </nav>
  );

  return (
    <div className="min-h-dvh bg-[#070b11] lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-ink lg:flex">
        <div className="border-b border-line p-5">
          <Image src={logo} alt="HANI BARBERSHOP" className="w-36" />
          <p className="mt-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted">Admin</p>
        </div>
        {nav}
      </aside>
      <header className="sticky top-0 z-30 flex h-14 items-center border-b border-line bg-ink/95 px-4 backdrop-blur lg:hidden">
        <Image src={logo} alt="HANI BARBERSHOP" className="w-28" />
        <button className="btn btn-ghost btn-sm ml-auto" onClick={() => setOpen(true)} aria-label="Menü öffnen" aria-expanded={open}>
          <Menu className="size-5" aria-hidden />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 flex bg-black/60 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin-Menü">
          <div className="flex w-72 flex-col bg-ink">
            <div className="flex items-center border-b border-line p-4">
              <span className="font-bold">Menü</span>
              <button className="btn btn-ghost btn-sm ml-auto" onClick={() => setOpen(false)} aria-label="Menü schließen">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            {nav}
          </div>
          <button className="flex-1" aria-label="Schließen" onClick={() => setOpen(false)} />
        </div>
      )}
      <main id="main" className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        {children}
      </main>
    </div>
  );
}
