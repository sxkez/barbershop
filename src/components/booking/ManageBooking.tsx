"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays, Loader2, X } from "lucide-react";
import { Calendar } from "./Calendar";
import { cn } from "@/lib/format";
import { formatDateLong } from "@/lib/time";

export function ManageBooking({ token, serviceId, startMonth }: { token: string; serviceId: string | null; startMonth: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "cancel" | "reschedule">("idle");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [month, setMonth] = useState(startMonth);
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);

  useEffect(() => {
    if (mode !== "reschedule" || !serviceId) return;
    setLoading(true);
    fetch(`/api/availability?service=${serviceId}&month=${month}`)
      .then((r) => r.json())
      .then((d) => setDates(d.dates ?? []))
      .finally(() => setLoading(false));
  }, [mode, month, serviceId]);

  useEffect(() => {
    if (!date || !serviceId) return;
    setSlots(null);
    fetch(`/api/availability?service=${serviceId}&date=${date}`)
      .then((r) => r.json())
      .then((d) => setSlots((d.slots ?? []).map((s: { time: string }) => s.time)));
  }, [date, serviceId]);

  const act = async (body: Record<string, string>) => {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/bookings/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, ...body }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg({ type: "err", text: data.error ?? "Das hat leider nicht geklappt." });
      return;
    }
    setMsg({ type: "ok", text: body.action === "cancel" ? "Dein Termin wurde storniert." : "Dein Termin wurde verschoben." });
    setMode("idle");
    router.refresh();
  };

  return (
    <div className="mt-8">
      {msg && (
        <p role="status" className={cn("mb-5 rounded-xl border p-4 text-sm", msg.type === "ok" ? "border-blue/40 bg-blue/10" : "border-red/50 bg-red/10")}>
          {msg.text}
        </p>
      )}
      {mode === "idle" && (
        <div className="flex flex-col gap-3 sm:flex-row">
          {serviceId && (
            <button type="button" className="btn btn-primary" onClick={() => setMode("reschedule")}>
              <CalendarDays className="size-5" aria-hidden /> Termin verschieben
            </button>
          )}
          <button type="button" className="btn btn-danger" onClick={() => setMode("cancel")}>
            <X className="size-5" aria-hidden /> Termin stornieren
          </button>
        </div>
      )}
      {mode === "cancel" && (
        <div className="card p-6" role="alertdialog" aria-labelledby="cancel-q">
          <p id="cancel-q" className="font-semibold">
            Möchtest du diesen Termin wirklich stornieren?
          </p>
          <p className="mt-1 text-sm text-muted">Der Zeitraum wird danach wieder für andere freigegeben.</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => act({ action: "cancel" })}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Ja, stornieren
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setMode("idle")}>
              Nein, behalten
            </button>
          </div>
        </div>
      )}
      {mode === "reschedule" && (
        <div className="space-y-5">
          <Calendar month={month} minMonth={startMonth < month ? startMonth : month} available={dates} selected={date} loading={loading} onMonthChange={setMonth} onSelect={setDate} />
          {date && (
            <div className="card p-5">
              <p className="mb-4 font-semibold">{formatDateLong(date)}</p>
              {slots === null ? (
                <Loader2 className="size-5 animate-spin" aria-label="Lädt" />
              ) : slots.length === 0 ? (
                <p className="text-sm text-muted">Keine freien Zeiten.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {slots.map((t) => (
                    <button key={t} type="button" disabled={busy} onClick={() => act({ action: "reschedule", date, time: t })} className="min-h-12 rounded-xl border border-line-strong font-bold hover:border-blue hover:bg-blue/10">
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button type="button" className="btn btn-ghost" onClick={() => setMode("idle")}>
            Abbrechen
          </button>
        </div>
      )}
    </div>
  );
}
