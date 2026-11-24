import Link from "next/link";
import { CalendarPlus, TriangleAlert } from "lucide-react";
import { getDb } from "@/lib/db";
import { listBookings } from "@/lib/booking/service";
import { getSettings } from "@/lib/settings";
import { addDays, formatDateLong, localToUtc, todayLocal } from "@/lib/time";
import { PageHeader, Panel, Stat, StatusBadge } from "@/components/admin/ui";

export default async function AdminOverview() {
  const db = await getDb();
  const settings = await getSettings(db);
  const tz = settings.timezone;
  const now = new Date();
  const today = todayLocal(now, tz);
  const since30 = new Date(now.getTime() - 30 * 86_400_000).toISOString();

  const [todays, upcoming, statusCounts, popular, loyalty, failedMail, unpublished] = await Promise.all([
    listBookings(db, localToUtc(today, 0, tz), localToUtc(addDays(today, 1), 0, tz)),
    listBookings(db, now, localToUtc(addDays(today, 8), 0, tz)),
    db.query<{ status: string; count: number }>(
      "select status, count(*)::int as count from bookings where starts_at >= $1 and starts_at < $2 group by status",
      [since30, now.toISOString()],
    ),
    db.query<{ service_name: string; count: number }>(
      `select service_name, count(*)::int as count from bookings
        where status <> 'cancelled' and created_at >= $1 group by service_name order by count desc limit 5`,
      [new Date(now.getTime() - 90 * 86_400_000).toISOString()],
    ),
    db.query<{ members: number; stamps: number; rewards: number }>(
      `select (select count(*)::int from loyalty_accounts) as members,
              (select coalesce(sum(delta), 0)::int from loyalty_transactions where type in ('stamp','migration') and created_at >= $1) as stamps,
              (select count(*)::int from loyalty_rewards where created_at >= $1) as rewards`,
      [since30],
    ),
    db.query<{ count: number }>("select count(*)::int as count from email_outbox where status = 'failed' and created_at >= $1", [since30]),
    db.query<{ count: number }>("select count(*)::int as count from services where active and archived_at is null and not price_published"),
  ]);

  const counts = Object.fromEntries(statusCounts.map((r) => [r.status, r.count]));
  const confirmedUpcoming = upcoming.filter((b) => b.status === "confirmed");

  const checklist = [
    unpublished[0].count > 0 && { text: `${unpublished[0].count} Leistungen ohne veröffentlichten Preis (Anzeige „Preis auf Anfrage“)`, href: "/admin/leistungen" },
    !settings.walkInConfirmed && { text: "Öffnungszeiten (Walk-in) noch nicht bestätigt", href: "/admin/einstellungen" },
    !settings.loyaltyRewardConfirmed && { text: "Kundenclub-Belohnung noch nicht bestätigt", href: "/admin/einstellungen" },
    !settings.googleReviewUrl && { text: "Google-Bewertungslink fehlt", href: "/admin/einstellungen" },
    !settings.email && { text: "Kontakt-E-Mail fehlt (Impressum)", href: "/admin/einstellungen" },
    process.env.LEGAL_TEXTS_REVIEWED !== "true" && { text: "Impressum & Datenschutz sind Entwürfe – vor Livegang prüfen lassen", href: "/impressum" },
    !process.env.RESEND_API_KEY && { text: "E-Mail-Versand nicht konfiguriert (RESEND_API_KEY)", href: null },
  ].filter(Boolean) as { text: string; href: string | null }[];

  return (
    <>
      <PageHeader
        title="Übersicht"
        description={formatDateLong(today)}
        actions={
          <Link href="/admin/termine/neu" className="btn btn-primary btn-sm">
            <CalendarPlus className="size-4" aria-hidden /> Termin anlegen
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Heute" value={todays.filter((b) => b.status !== "cancelled").length} hint="Termine" />
        <Stat label="Nächste 7 Tage" value={confirmedUpcoming.length} hint="bestätigt" />
        <Stat label="No-Shows (30 T.)" value={counts.no_show ?? 0} hint={`${counts.completed ?? 0} erledigt · ${counts.cancelled ?? 0} storniert`} />
        <Stat label="Kundenclub" value={loyalty[0].members} hint={`${loyalty[0].stamps} Stempel · ${loyalty[0].rewards} Belohnungen (30 T.)`} />
      </div>

      {checklist.length > 0 && (
        <Panel title="Vom Inhaber zu bestätigen" className="mt-6 border-gold/40">
          <ul className="space-y-2 text-sm">
            {checklist.map((c) => (
              <li key={c.text} className="flex items-start gap-2">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                {c.href ? (
                  <Link href={c.href} className="hover:underline">
                    {c.text}
                  </Link>
                ) : (
                  c.text
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Heute"
          actions={
            <Link href="/admin/termine" className="text-xs text-blue-soft hover:underline">
              Kalender →
            </Link>
          }
        >
          {todays.length === 0 ? (
            <p className="text-sm text-muted">Heute keine Termine.</p>
          ) : (
            <ul className="divide-y divide-line">
              {todays.map((b) => (
                <li key={b.id}>
                  <Link href={`/admin/termine/${b.id}`} className="flex items-center gap-4 py-3 hover:bg-white/[0.02]">
                    <span className="w-14 font-mono text-sm font-bold">{b.localTime}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{b.contactName}</span>
                      <span className="block truncate text-xs text-muted">{b.serviceName}</span>
                    </span>
                    <StatusBadge status={b.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <div className="space-y-6">
          <Panel title="Beliebteste Leistungen (90 Tage)">
            {popular.length === 0 ? (
              <p className="text-sm text-muted">Noch keine Daten.</p>
            ) : (
              <ul className="space-y-3">
                {popular.map((p) => {
                  const max = popular[0].count;
                  return (
                    <li key={p.service_name}>
                      <div className="flex justify-between text-sm">
                        <span>{p.service_name}</span>
                        <span className="tabular-nums text-muted">{p.count}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-blue" style={{ width: `${(p.count / max) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
          {failedMail[0].count > 0 && (
            <Panel title="E-Mail-Probleme" className="border-red/40">
              <p className="text-sm">{failedMail[0].count} E-Mails konnten in den letzten 30 Tagen nicht gesendet werden.</p>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
