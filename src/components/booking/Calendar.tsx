"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/format";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** Month grid. Only `available` dates are selectable. */
export function Calendar({
  month,
  available,
  selected,
  loading,
  minMonth,
  onMonthChange,
  onSelect,
}: {
  month: string;
  available: string[];
  selected: string | null;
  loading: boolean;
  minMonth: string;
  onMonthChange: (m: string) => void;
  onSelect: (d: string) => void;
}) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const set = new Set(available);
  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];

  return (
    <div className="card p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="btn btn-ghost size-11 p-0"
          onClick={() => onMonthChange(shiftMonth(month, -1))}
          disabled={month <= minMonth}
          aria-label="Vorheriger Monat"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <p className="text-lg font-bold capitalize" aria-live="polite">
          {monthLabel(month)}
        </p>
        <button type="button" className="btn btn-ghost size-11 p-0" onClick={() => onMonthChange(shiftMonth(month, 1))} aria-label="Nächster Monat">
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>
      <div role="grid" aria-label={`Verfügbare Tage im ${monthLabel(month)}`} aria-busy={loading} className="mt-4">
        <div role="row" className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-muted">
          {WEEKDAYS.map((w) => (
            <div role="columnheader" key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>
        <div role="row" className="mt-1 grid grid-cols-7 gap-1.5">
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} role="gridcell" />;
            const isAvail = set.has(d);
            const isSel = selected === d;
            const label = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
              new Date(`${d}T12:00:00Z`),
            );
            return (
              <div role="gridcell" key={d}>
                <button
                  type="button"
                  disabled={!isAvail}
                  onClick={() => onSelect(d)}
                  aria-pressed={isSel}
                  aria-label={`${label}${isAvail ? ", verfügbar" : ", nicht verfügbar"}`}
                  className={cn(
                    "grid aspect-square w-full place-items-center rounded-xl text-sm font-semibold transition-colors sm:text-base",
                    isSel
                      ? "bg-blue text-white shadow-[0_8px_24px_-8px_rgba(8,123,255,0.9)]"
                      : isAvail
                        ? "border border-blue/50 bg-blue/10 text-fg hover:bg-blue/25"
                        : "text-fg/25",
                    loading && "animate-pulse",
                  )}
                >
                  {Number(d.slice(8))}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted">
        <span className="inline-block size-3 rounded border border-blue/50 bg-blue/10" aria-hidden /> buchbar
        <span className="ml-3 inline-block size-3 rounded bg-blue" aria-hidden /> ausgewählt
      </p>
    </div>
  );
}
