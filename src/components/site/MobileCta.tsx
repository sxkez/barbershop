"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Phone } from "lucide-react";
import { telHref } from "@/lib/format";

/** Sticky booking CTA for phones. Hidden where it would get in the way. */
export function MobileCta({ phone }: { phone: string }) {
  const pathname = usePathname();
  if (pathname.startsWith("/termin") || pathname.startsWith("/kundenclub/karte")) return null;
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/90 backdrop-blur-xl sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="container-page flex gap-2 py-2.5">
        <a href={telHref(phone)} className="btn btn-ghost size-12 shrink-0 p-0" aria-label={`Anrufen: ${phone}`}>
          <Phone className="size-5" aria-hidden />
        </a>
        <Link href="/termin" className="btn btn-primary flex-1">
          <CalendarDays className="size-5" aria-hidden /> Termin buchen
        </Link>
      </div>
    </div>
  );
}
