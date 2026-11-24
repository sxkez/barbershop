"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarPlus, Check, CircleCheck, Clock, Info, Loader2, MapPin, Phone, Scissors } from "lucide-react";
import { Calendar } from "./Calendar";
import { cn, telHref } from "@/lib/format";
import { formatDateLong } from "@/lib/time";
import { StepIndicator } from "./StepIndicator";

export type WizardService = {
  id: string;
  slug: string;
  name: string;
  includes: string | null;
  durationMinutes: number;
  priceLabel: string;
  isPackage: boolean;
};

type Details = { fullName: string; phone: string; email: string; notes: string; privacy: boolean; joinLoyalty: boolean; website: string };
type Confirmation = {
  booking: {
    reference: string;
    serviceName: string;
    date: string;
    time: string;
    durationMinutes: number;
    price: string | null;
    location: string;
    cancellationHours: number;
    phone: string;
  };
  manageUrl: string | null;
  emailSent?: boolean;
};

const STEPS = ["Leistung", "Datum", "Uhrzeit", "Daten", "Prüfen"];

export function BookingWizard({
  services,
  initialServiceSlug,
  startMonth,
  phone,
  loyaltyEnabled,
}: {
  services: WizardService[];
  initialServiceSlug: string | null;
  startMonth: string;
  phone: string;
  loyaltyEnabled: boolean;
}) {
  const initial = services.find((s) => s.slug === initialServiceSlug) ?? null;
  const [step, setStep] = useState(initial ? 1 : 0);
  const [service, setService] = useState<WizardService | null>(initial);
  const [month, setMonth] = useState(startMonth);
  const [dates, setDates] = useState<string[]>([]);
  const [datesLoading, setDatesLoading] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [details, setDetails] = useState<Details>({ fullName: "", phone: "", email: "", notes: "", privacy: false, joinLoyalty: false, website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Confirmation | null>(null);
  const startedAt = useRef(Date.now());
  const idemKey = useRef<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Load available dates for the month
  useEffect(() => {
    if (!service) return;
    const ctrl = new AbortController();
    setDatesLoading(true);
    fetch(`/api/availability?service=${service.id}&month=${month}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => setDates(d.dates ?? []))
      .catch(() => {})
      .finally(() => setDatesLoading(false));
    return () => ctrl.abort();
  }, [service, month]);

  // Load slots for the selected date
  const loadSlots = useCallback(async (svc: WizardService, d: string) => {
    setSlots(null);
    const r = await fetch(`/api/availability?service=${svc.id}&date=${d}`);
    const data = await r.json();
    setSlots((data.slots ?? []).map((s: { time: string }) => s.time));
  }, []);

  useEffect(() => {
    if (service && date) loadSlots(service, date);
  }, [service, date, loadSlots]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step, done]);

  const go = (n: number) => {
    setFormError(null);
    setStep(n);
  };

  const validateDetails = () => {
    const e: Record<string, string> = {};
    if (details.fullName.trim().length < 2) e.fullName = "Bitte gib deinen Namen an.";
    if (!/^\+?[0-9 ()/\-]{6,24}$/.test(details.phone.trim())) e.phone = "Bitte gib eine gültige Telefonnummer an.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(details.email.trim())) e.email = "Bitte gib eine gültige E-Mail-Adresse an.";
    if (!details.privacy) e.privacy = "Bitte bestätige die Datenschutzhinweise.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!service || !date || !time) return;
    setSubmitting(true);
    setFormError(null);
    idemKey.current ??= crypto.randomUUID();
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: service.id, date, time, ...details, idempotencyKey: idemKey.current, startedAt: startedAt.current }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(data);
        return;
      }
      if (data.fields) {
        setErrors(data.fields);
        go(3);
      }
      if (res.status === 409) {
        // slot gone — refresh times and send the customer back to pick another one
        idemKey.current = null;
        setTime(null);
        await loadSlots(service, date);
        go(2);
      }
      setFormError(data.error ?? "Die Buchung konnte nicht abgeschlossen werden.");
    } catch {
      setFormError("Keine Verbindung. Bitte prüfe dein Internet und versuche es erneut.");
    } finally {
      setSubmitting(false);
    }
  };

  const summary = useMemo(
    () =>
      [
        service && { icon: Scissors, label: "Leistung", value: service.name },
        date && { icon: Clock, label: "Datum", value: formatDateLong(date) + (time ? `, ${time} Uhr` : "") },
      ].filter(Boolean) as { icon: typeof Scissors; label: string; value: string }[],
    [service, date, time],
  );

  if (done) return <ConfirmationView data={done} headingRef={headingRef} />;

  return (
    <div>
      <StepIndicator steps={STEPS} current={step} />

      {summary.length > 0 && step > 0 && (
        <ul className="mt-6 flex flex-wrap gap-2" aria-label="Deine Auswahl">
          {summary.map(({ icon: Icon, label, value }) => (
            <li key={label} className="chip border-blue/40 text-fg/90">
              <Icon className="size-3.5 text-blue-soft" aria-hidden />
              <span className="sr-only">{label}: </span>
              {value}
            </li>
          ))}
        </ul>
      )}

      {formError && (
        <div role="alert" className="mt-6 flex gap-3 rounded-xl border border-red/50 bg-red/10 p-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-red" aria-hidden />
          {formError}
        </div>
      )}

      <section key={step} className="step-in mt-8" aria-labelledby="step-title">
          {step === 0 && (
            <>
              <StepTitle refEl={headingRef}>Leistung oder Paket wählen</StepTitle>
              <ul className="grid gap-3 sm:grid-cols-2">
                {services.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setService(s);
                        setDate(null);
                        setTime(null);
                        go(1);
                      }}
                      aria-pressed={service?.id === s.id}
                      className={cn(
                        "card card-hover flex h-full w-full flex-col items-start gap-1 p-5 text-left",
                        service?.id === s.id && "border-blue",
                      )}
                    >
                      {s.isPackage && <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-blue-soft">Paket</span>}
                      <span className="font-bold">{s.name}</span>
                      {s.includes && <span className="text-sm text-muted">{s.includes}</span>}
                      <span className="mt-3 flex w-full items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-muted">
                          <Clock className="size-3.5" aria-hidden /> ca. {s.durationMinutes} Min.
                        </span>
                        <span className="font-semibold text-fg/90">{s.priceLabel}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {step === 1 && service && (
            <>
              <StepTitle refEl={headingRef}>Datum wählen</StepTitle>
              <Calendar
                month={month}
                minMonth={startMonth}
                available={dates}
                selected={date}
                loading={datesLoading}
                onMonthChange={setMonth}
                onSelect={(d) => {
                  setDate(d);
                  setTime(null);
                  go(2);
                }}
              />
              {!datesLoading && dates.length === 0 && (
                <p className="mt-4 text-sm text-muted">In diesem Monat sind keine Termine frei. Schau gern in den nächsten Monat.</p>
              )}
              <p className="mt-4 flex items-start gap-2 text-sm text-muted">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> Online buchbar: Montag & Dienstag, 10:00 – 19:00 Uhr.
              </p>
              <NavRow onBack={() => go(0)} />
            </>
          )}

          {step === 2 && service && date && (
            <>
              <StepTitle refEl={headingRef}>Uhrzeit wählen</StepTitle>
              <p className="-mt-3 mb-5 text-muted">{formatDateLong(date)}</p>
              {slots === null ? (
                <div className="flex items-center gap-3 text-muted" role="status">
                  <Loader2 className="size-5 animate-spin" aria-hidden /> Freie Zeiten werden geladen …
                </div>
              ) : slots.length === 0 ? (
                <p className="card p-6 text-muted">An diesem Tag ist leider nichts mehr frei. Bitte wähle ein anderes Datum.</p>
              ) : (
                <div role="radiogroup" aria-label="Freie Uhrzeiten" className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
                  {slots.map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={time === t}
                      onClick={() => {
                        setTime(t);
                        go(3);
                      }}
                      className={cn(
                        "min-h-[3.25rem] rounded-xl border text-base font-bold transition-colors",
                        time === t ? "border-blue bg-blue text-white" : "border-line-strong bg-surface hover:border-blue hover:bg-blue/10",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
              <NavRow onBack={() => go(1)} />
            </>
          )}

          {step === 3 && (
            <>
              <StepTitle refEl={headingRef}>Deine Daten</StepTitle>
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  if (validateDetails()) go(4);
                }}
                className="card grid gap-5 p-5 sm:p-7"
              >
                <Field id="fullName" label="Vor- und Nachname" error={errors.fullName}>
                  <input
                    id="fullName"
                    className="field"
                    autoComplete="name"
                    value={details.fullName}
                    onChange={(e) => setDetails({ ...details, fullName: e.target.value })}
                    aria-invalid={!!errors.fullName}
                    aria-describedby={errors.fullName ? "fullName-err" : undefined}
                    required
                  />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="phone" label="Telefon" error={errors.phone}>
                    <input
                      id="phone"
                      className="field"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={details.phone}
                      onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                      aria-invalid={!!errors.phone}
                      aria-describedby={errors.phone ? "phone-err" : undefined}
                      required
                    />
                  </Field>
                  <Field id="email" label="E-Mail" error={errors.email}>
                    <input
                      id="email"
                      className="field"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={details.email}
                      onChange={(e) => setDetails({ ...details, email: e.target.value })}
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? "email-err" : "email-hint"}
                      required
                    />
                    <p id="email-hint" className="mt-1.5 text-xs text-muted">
                      Hierhin schicken wir deine Bestätigung.
                    </p>
                  </Field>
                </div>
                <Field id="notes" label="Anmerkung (optional)" error={errors.notes}>
                  <textarea
                    id="notes"
                    className="field min-h-24"
                    maxLength={500}
                    value={details.notes}
                    onChange={(e) => setDetails({ ...details, notes: e.target.value })}
                  />
                </Field>
                {/* Honeypot: hidden from people, tempting for bots */}
                <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                  <label htmlFor="website">Website</label>
                  <input id="website" tabIndex={-1} autoComplete="off" value={details.website} onChange={(e) => setDetails({ ...details, website: e.target.value })} />
                </div>
                {loyaltyEnabled && (
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4">
                    <input
                      type="checkbox"
                      className="mt-1 size-5 accent-blue"
                      checked={details.joinLoyalty}
                      onChange={(e) => setDetails({ ...details, joinLoyalty: e.target.checked })}
                    />
                    <span className="text-sm">
                      <span className="font-semibold">Digitale Stempelkarte anlegen</span> <span className="text-muted">(optional)</span>
                      <br />
                      <span className="text-muted">Stempel bekommst du im Shop. Du kannst die Karte jederzeit löschen lassen.</span>
                    </span>
                  </label>
                )}
                <div>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 size-5 accent-blue"
                      checked={details.privacy}
                      onChange={(e) => setDetails({ ...details, privacy: e.target.checked })}
                      aria-invalid={!!errors.privacy}
                      aria-describedby={errors.privacy ? "privacy-err" : undefined}
                    />
                    <span className="text-sm text-fg/85">
                      Ich habe die{" "}
                      <Link href="/datenschutz" target="_blank" className="text-blue-soft underline">
                        Datenschutzhinweise
                      </Link>{" "}
                      gelesen. Meine Angaben werden zur Terminverwaltung gespeichert.
                    </span>
                  </label>
                  {errors.privacy && (
                    <p id="privacy-err" className="mt-1.5 text-sm text-red">
                      {errors.privacy}
                    </p>
                  )}
                </div>
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <button type="button" className="btn btn-ghost" onClick={() => go(2)}>
                    <ArrowLeft className="size-4" aria-hidden /> Zurück
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Weiter <ArrowRight className="size-4" aria-hidden />
                  </button>
                </div>
              </form>
            </>
          )}

          {step === 4 && service && date && time && (
            <>
              <StepTitle refEl={headingRef}>Prüfen & bestätigen</StepTitle>
              <div className="card divide-y divide-line">
                {[
                  ["Leistung", service.name],
                  ["Datum", formatDateLong(date)],
                  ["Uhrzeit", `${time} Uhr`],
                  ["Dauer", `ca. ${service.durationMinutes} Minuten`],
                  ["Preis", service.priceLabel],
                  ["Name", details.fullName],
                  ["Telefon", details.phone],
                  ["E-Mail", details.email],
                  ...(details.notes ? [["Anmerkung", details.notes]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:justify-between sm:gap-6">
                    <span className="text-sm text-muted">{k}</span>
                    <span className="font-semibold sm:text-right">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button type="button" className="btn btn-ghost" onClick={() => go(3)} disabled={submitting}>
                  <ArrowLeft className="size-4" aria-hidden /> Ändern
                </button>
                <button type="button" className="btn btn-primary" onClick={submit} disabled={submitting} aria-busy={submitting}>
                  {submitting ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Check className="size-5" aria-hidden />}
                  Verbindlich buchen
                </button>
              </div>
            </>
          )}
      </section>

      <p className="mt-10 text-center text-sm text-muted">
        Fragen? Ruf uns an:{" "}
        <a href={telHref(phone)} className="font-semibold text-fg hover:text-blue-soft">
          {phone}
        </a>
      </p>
    </div>
  );
}

function StepTitle({ children, refEl }: { children: React.ReactNode; refEl: React.RefObject<HTMLHeadingElement | null> }) {
  return (
    <h2 id="step-title" ref={refEl} tabIndex={-1} className="display mb-6 text-2xl outline-none md:text-3xl">
      {children}
    </h2>
  );
}

function NavRow({ onBack }: { onBack: () => void }) {
  return (
    <div className="mt-8">
      <button type="button" className="btn btn-ghost" onClick={onBack}>
        <ArrowLeft className="size-4" aria-hidden /> Zurück
      </button>
    </div>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-sm text-red">
          {error}
        </p>
      )}
    </div>
  );
}

function ConfirmationView({ data, headingRef }: { data: Confirmation; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  const b = data.booking;
  return (
    <div className="card glow-blue p-6 text-center sm:p-10">
      <CircleCheck className="mx-auto size-16 text-blue" strokeWidth={1.5} aria-hidden />
      <h2 ref={headingRef} tabIndex={-1} className="display mt-5 text-3xl outline-none md:text-4xl">
        Termin bestätigt!
      </h2>
      <p className="mt-2 text-muted">
        {data.emailSent ? "Wir haben dir eine Bestätigung per E-Mail geschickt." : "Bitte notiere dir deine Buchungsnummer oder füge den Termin deinem Kalender hinzu."}
      </p>
      <dl className="mx-auto mt-8 max-w-md divide-y divide-line rounded-2xl border border-line text-left">
        {[
          ["Buchungsnummer", b.reference],
          ["Leistung", b.serviceName],
          ["Datum", formatDateLong(b.date)],
          ["Uhrzeit", `${b.time} Uhr`],
          ["Dauer", `ca. ${b.durationMinutes} Minuten`],
          ...(b.price ? [["Preis", b.price]] : []),
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-5 py-3">
            <dt className="text-sm text-muted">{k}</dt>
            <dd className="text-right font-semibold">{v}</dd>
          </div>
        ))}
        <div className="flex gap-3 px-5 py-3 text-sm">
          <MapPin className="mt-0.5 size-4 shrink-0 text-blue-soft" aria-hidden /> {b.location}
        </div>
      </dl>
      <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-muted">
        Stornieren oder verschieben kannst du bis {b.cancellationHours} Stunden vorher über den Link in deiner E-Mail. Danach ruf uns bitte an:{" "}
        <a href={telHref(b.phone)} className="text-fg">
          {b.phone}
        </a>
        .
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        {data.manageUrl && (
          <>
            <a href={`/api/bookings/ics?token=${encodeURIComponent(data.manageUrl.split("/").pop()!)}`} className="btn btn-ghost">
              <CalendarPlus className="size-5" aria-hidden /> Zum Kalender hinzufügen
            </a>
            <Link href={data.manageUrl} className="btn btn-ghost">
              Termin verwalten
            </Link>
          </>
        )}
        <Link href="/" className="btn btn-primary">
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}
