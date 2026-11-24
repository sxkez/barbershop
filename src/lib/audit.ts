import type { Queryable } from "@/lib/db/types";

export type AuditActor = { type: "admin" | "customer" | "system"; id?: string | null };

/** Append-only audit trail. Keep `details` free of unnecessary personal data. */
export async function audit(
  q: Queryable,
  actor: AuditActor,
  action: string,
  entity: string,
  entityId: string | null,
  details: Record<string, unknown> = {},
) {
  await q.query(
    "insert into audit_logs (actor_type, actor_id, action, entity, entity_id, details) values ($1, $2, $3, $4, $5, $6)",
    [actor.type, actor.id ?? null, action, entity, entityId, JSON.stringify(details)],
  );
}
