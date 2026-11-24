import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { formatInstant } from "@/lib/time";
import { PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Protokoll" };

export default async function AuditPage() {
  const rows = await (await getDb()).query<{ id: number; actor_type: string; action: string; entity: string; entity_id: string | null; created_at: string; details: unknown }>(
    "select id, actor_type, action, entity, entity_id, created_at, details from audit_logs order by id desc limit 200",
  );
  return (
    <>
      <PageHeader title="Protokoll" description="Die letzten 200 Änderungen (Termine, Kundenclub, Einstellungen). Einträge können nicht bearbeitet werden." />
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted">
            <tr className="border-b border-line">
              <th className="px-4 py-3 font-medium">Zeit</th>
              <th className="px-4 py-3 font-medium">Wer</th>
              <th className="px-4 py-3 font-medium">Aktion</th>
              <th className="px-4 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted">{formatInstant(new Date(r.created_at))}</td>
                <td className="px-4 py-2.5">{r.actor_type}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{r.action}</td>
                <td className="max-w-md truncate px-4 py-2.5 font-mono text-xs text-muted">{JSON.stringify(r.details)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
