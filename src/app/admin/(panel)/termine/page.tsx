import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { getDb } from "@/lib/db";
import { listBookings, type BookingView } from "@/lib/booking/service";
import { getSettings } from "@/lib/settings";
import { addDays, formatDateLong, formatDateShort, isLocalDate, isoWeekday, localToUtc, todayLocal } from "@/lib/time";
import { Flash, PageHeader, StatusBadge } from "@/components/admin/ui";
import { cn } from "@/lib/format";

export const metadata: Metadata = { title: "Termine" };

type Props = { searchParams: Promise<{ view?: string; date?: string; ok?: string; error?: string; status?: string }> };

const HOUR_START = 8;
const HOUR_END = 20;
const PX_PER_MIN = 1.6;

export default async function TerminePage({ searchParams }: Props) {
  const sp = await searchParams;
  const db = await getDb();
  const settings = await getSettings(db);
  const tz = settings.timezone;
  const today = todayLocal(new Date(), tz);
  const view = sp.view === "day" ? "day" : sp.view === "list" ? "list" : "week";
  const anchor = sp.date && isLocalDate(sp.date) ? sp.date : today;
  const weekStart = addDays(anchor, 1 - isoWeekday(anchor));
  const from = view === "day" ? anchor : view === "list" ? anchor : weekStart;
  const days = view === "day" ? 1 : view === "list" ? 30 : 7;
  const to = addDays(from, days);
  const all = await listBookings(db, localToUtc(from, 0, tz), localToUtc(to, 0, tz));
  const showCancelled = sp.status === "alle";
  const bookings = showCancelled ? all : all.filter((b) => b.status !== "cancelled");
  const step = view === "day" ? 1 : view === "list" ? 30 : 7;
  const link = (params: Record<string, string>) => `/admin/termine?${new URLSearchParams({ view, date: anchor, ...(showCancelled ? { status: "alle" } : {}), ...params })}`;

  const dayList = Array.from({ length: days }, (_, i) => addDays(from, i));

  return (
    <>
      <PageHeader
        title="Termine"
        description={view === "day" ? formatDateLong(anchor) : `${formatDateShort(from)} – ${formatDateShort(addDays(to, -1))}`}
        actions={
          <Link href="/admin/termine/neu" className="btn btn-primary btn-sm">
            <CalendarPlus className="size-4" aria-hidden /> Termin anlegen
          </Link>
        }
      />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="Ansicht">
          {(["day", "week", "list"] as const).map((v) => (
            <Link
              key={v}
              href={`/admin/termine?${new URLSearchParams({ view: v, date: anchor })}`}
              aria-current={view === v ? "page" : undefined}
              className={cn("rounded-md px-3 py-1.5 text-sm font-medium", view === v ? "bg-blue text-white" : "text-fg/70 hover:text-fg")}
            >
              {v === "day" ? "Tag" : v === "week" ? "Woche" : "Liste"}
            </Link>
          ))}
        </div>
        <Link href={link({ date: addDays(anchor, -step) })} className="btn btn-ghost btn-sm" aria-label="Zurück">
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
        <Link href={link({ date: today })} className="btn btn-ghost btn-sm">
          Heute
        </Link>
        <Link href={link({ date: addDays(anchor, step) })} className="btn btn-ghost btn-sm" aria-label="Weiter">
          <ChevronRight className="size-4" aria-hidden />
        </Link>
        <form className="ml-auto flex items-center gap-2" action="/admin/termine">
          <input type="hidden" name="view" value={view} />
          <label htmlFor="jump" className="sr-only">
            Datum
          </label>
          <input id="jump" type="date" name="date" defaultValue={anchor} className="field min-h-9 py-1 text-sm" />
          <button className="btn btn-ghost btn-sm">Los</button>
        </form>
        <Link href={link({ status: showCancelled ? "" : "alle" })} className="text-xs text-muted hover:text-fg">
          {showCancelled ? "Stornierte ausblenden" : "Stornierte anzeigen"}
        </Link>
      </div>

      {view === "list" ? (
        <BookingTable bookings={bookings} />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-line bg-surface md:block">
            <div className="grid min-w-[760px]" style={{ gridTemplateColumns: `56px repeat(${dayList.length}, minmax(0,1fr))` }}>
              <div className="border-b border-line" />
              {dayList.map((d) => (
                <Link
                  key={d}
                  href={`/admin/termine?view=day&date=${d}`}
                  className={cn("border-b border-l border-line px-3 py-2.5 text-sm font-semibold hover:bg-white/[0.03]", d === today && "text-blue-soft")}
                >
                  {formatDateShort(d)}
                </Link>
              ))}
              <div className="relative" style={{ height: (HOUR_END - HOUR_START) * 60 * PX_PER_MIN }}>
                {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                  <span key={i} className="absolute right-2 -translate-y-1/2 text-[0.7rem] text-muted" style={{ top: i * 60 * PX_PER_MIN }}>
                    {i > 0 ? `${HOUR_START + i}:00` : ""}
                  </span>
                ))}
              </div>
              {dayList.map((d) => (
                <DayColumn key={d} date={d} bookings={bookings.filter((b) => b.localDate === d)} />
              ))}
            </div>
          </div>
          <div className="md:hidden">
            <BookingTable bookings={bookings} />
          </div>
        </>
      )}
    </>
  );
}

function DayColumn({ date, bookings }: { date: string; bookings: BookingView[] }) {
  return (
    <div className="relative border-l border-line" style={{ height: (HOUR_END - HOUR_START) * 60 * PX_PER_MIN }} aria-label={formatDateLong(date)}>
      {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
        <div key={i} className="absolute inset-x-0 border-t border-line/60" style={{ top: i * 60 * PX_PER_MIN }} />
      ))}
      {bookings.map((b) => {
        const [h, m] = b.localTime.split(":").map(Number);
        const top = ((h - HOUR_START) * 60 + m) * PX_PER_MIN;
        const height = Math.max(b.durationMinutes * PX_PER_MIN - 2, 22);
        return (
          <Link
            key={b.id}
            href={`/admin/termine/${b.id}`}
            className={cn(
              "absolute inset-x-1 overflow-hidden rounded-md border px-2 py-1 text-xs leading-tight transition-colors",
              b.status === "confirmed" && "border-blue/60 bg-blue/20 hover:bg-blue/30",
              b.status === "completed" && "border-emerald-500/50 bg-emerald-500/15",
              b.status === "no_show" && "border-red/60 bg-red/15",
              b.status === "cancelled" && "border-line bg-white/5 text-muted line-through",
            )}
            style={{ top, height }}
          >
            <span className="block truncate"><span className="font-bold">{b.localTime}</span> {b.contactName}</span>
            <span className="block truncate text-fg/70">{b.serviceName}</span>
          </Link>
        );
      })}
    </div>
  );
}

function BookingTable({ bookings }: { bookings: BookingView[] }) {
  if (bookings.length === 0) return <p className="rounded-2xl border border-line bg-surface p-6 text-sm text-muted">Keine Termine in diesem Zeitraum.</p>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-muted">
          <tr className="border-b border-line">
            <th className="px-4 py-3 font-medium">Datum</th>
            <th className="px-4 py-3 font-medium">Zeit</th>
            <th className="px-4 py-3 font-medium">Kunde</th>
            <th className="px-4 py-3 font-medium">Leistung</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {bookings.map((b) => (
            <tr key={b.id} className="hover:bg-white/[0.02]">
              <td className="px-4 py-3">{formatDateShort(b.localDate)}</td>
              <td className="px-4 py-3 font-mono">{b.localTime}</td>
              <td className="px-4 py-3">
                <Link href={`/admin/termine/${b.id}`} className="font-medium hover:text-blue-soft">
                  {b.contactName}
                </Link>
                <span className="block text-xs text-muted">{b.reference}</span>
              </td>
              <td className="px-4 py-3 text-fg/85">{b.serviceName}</td>
              <td className="px-4 py-3">
                <StatusBadge status={b.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
