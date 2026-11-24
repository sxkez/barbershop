import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { getDb } from "@/lib/db";
import { getBookingById } from "@/lib/booking/service";
import { formatDateLong, formatInstant } from "@/lib/time";
import { formatPrice, telHref } from "@/lib/format";
import { Flash, PageHeader, Panel, StatusBadge, STATUS_LABEL } from "@/components/admin/ui";
import { resendConfirmationAction, rescheduleBookingAction, setBookingStatusAction } from "../../../actions/bookings";

export const metadata: Metadata = { title: "Termin" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

const NEXT: Record<string, { status: string; label: string; cls: string }[]> = {
  confirmed: [
    { status: "completed", label: "Als erledigt markieren", cls: "btn-primary" },
    { status: "no_show", label: "Nicht erschienen", cls: "btn-ghost" },
  ],
  completed: [{ status: "confirmed", label: "Zurück auf bestätigt", cls: "btn-ghost" }],
  no_show: [{ status: "confirmed", label: "Zurück auf bestätigt", cls: "btn-ghost" }],
  cancelled: [{ status: "confirmed", label: "Wieder bestätigen", cls: "btn-ghost" }],
};

export default async function BookingDetail({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await getDb();
  const b = await getBookingById(db, id);
  if (!b) notFound();
  const history = await db.query<{ action: string; actor_type: string; created_at: string; details: Record<string, unknown> }>(
    "select action, actor_type, created_at, details from audit_logs where entity = 'booking' and entity_id = $1 order by id desc limit 20",
    [id],
  );

  return (
    <>
      <Link href={`/admin/termine?view=day&date=${b.localDate}`} className="mb-4 inline-flex items-center gap-2 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Zum Kalender
      </Link>
      <PageHeader title={`${b.localTime} Uhr · ${b.contactName}`} description={`${formatDateLong(b.localDate)} · ${b.reference}`} actions={<StatusBadge status={b.status} />} />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Panel title="Termin">
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {[
                ["Leistung", b.serviceName],
                ["Dauer", `${b.durationMinutes} Min.`],
                ["Preis", b.priceCents != null ? formatPrice(b.priceCents) : "–"],
                ["Barber", b.barberName],
                ["Quelle", b.source === "online" ? "Online" : "Admin"],
                ["Gebucht am", formatInstant(b.createdAt)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {b.notes && <p className="mt-4 rounded-lg bg-white/5 p-3 text-sm">„{b.notes}“</p>}
          </Panel>
          <Panel title="Kunde">
            <p className="font-semibold">{b.contactName}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={telHref(b.contactPhone)} className="btn btn-ghost btn-sm">
                <Phone className="size-4" aria-hidden /> {b.contactPhone}
              </a>
              <a href={`mailto:${b.contactEmail}`} className="btn btn-ghost btn-sm">
                <Mail className="size-4" aria-hidden /> {b.contactEmail}
              </a>
            </div>
          </Panel>
          <Panel title="Verlauf">
            <ul className="space-y-2 text-sm">
              {history.map((h, i) => (
                <li key={i} className="flex justify-between gap-4">
                  <span>
                    {h.action.replace("booking.", "")} <span className="text-muted">({h.actor_type})</span>
                  </span>
                  <span className="text-xs text-muted">{formatInstant(new Date(h.created_at))}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Status ändern">
            <div className="flex flex-wrap gap-2">
              {(NEXT[b.status] ?? []).map((n) => (
                <form key={n.status} action={setBookingStatusAction}>
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="status" value={n.status} />
                  <button className={`btn btn-sm ${n.cls}`}>{n.label}</button>
                </form>
              ))}
            </div>
            {b.status === "confirmed" && (
              <form action={setBookingStatusAction} className="mt-5 space-y-3 border-t border-line pt-5">
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="status" value="cancelled" />
                <label htmlFor="reason" className="label">
                  Stornieren – Grund (intern)
                </label>
                <input id="reason" name="reason" className="field" placeholder="z. B. Krankheit" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="notify" defaultChecked className="size-4 accent-blue" /> Kunde per E-Mail informieren
                </label>
                <button className="btn btn-danger btn-sm">Termin stornieren</button>
              </form>
            )}
            <p className="mt-4 text-xs text-muted">Aktuell: {STATUS_LABEL[b.status]}</p>
          </Panel>
          {b.status === "confirmed" && (
            <Panel title="Verschieben">
              <form action={rescheduleBookingAction} className="space-y-3">
                <input type="hidden" name="id" value={b.id} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="date" className="label">
                      Datum
                    </label>
                    <input id="date" type="date" name="date" defaultValue={b.localDate} className="field" required />
                  </div>
                  <div>
                    <label htmlFor="time" className="label">
                      Uhrzeit
                    </label>
                    <input id="time" type="time" name="time" step={300} defaultValue={b.localTime} className="field" required />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="notify" defaultChecked className="size-4 accent-blue" /> Kunde per E-Mail informieren
                </label>
                <button className="btn btn-primary btn-sm">Verschieben</button>
                <p className="text-xs text-muted">Überschneidungen mit anderen Terminen werden von der Datenbank verhindert.</p>
              </form>
            </Panel>
          )}
          {b.status === "confirmed" && (
            <form action={resendConfirmationAction}>
              <input type="hidden" name="id" value={b.id} />
              <button className="btn btn-ghost btn-sm w-full">
                <Mail className="size-4" aria-hidden /> Bestätigung erneut senden
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
