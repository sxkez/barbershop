import "server-only";
import type { Queryable } from "@/lib/db/types";
import { getSettings } from "@/lib/settings";

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  template: string;
  attachments?: { filename: string; content: string; contentType: string }[];
};

/**
 * Sends a transactional e-mail via Resend when RESEND_API_KEY is configured.
 * Without a key (local development) the e-mail is only recorded in
 * email_outbox with status "logged" and printed (without personal data) to the console.
 */
export async function sendEmail(q: Queryable, mail: OutgoingEmail): Promise<{ ok: boolean }> {
  const [row] = await q.query<{ id: string }>(
    "insert into email_outbox (to_email, subject, template) values ($1, $2, $3) returning id",
    [mail.to, mail.subject, mail.template],
  );
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    await q.query("update email_outbox set status = 'logged' where id = $1", [row.id]);
    console.info(`[email] ${mail.template} queued (outbox ${row.id}) — RESEND_API_KEY not set, not sent.`);
    if (process.env.NODE_ENV !== "production" && process.env.EMAIL_DEV_LOG === "true") console.info(mail.text);
    return { ok: true };
  }
  const settings = await getSettings(q);
  const from = process.env.EMAIL_FROM ?? settings.emailFrom;
  if (!from) {
    await q.query("update email_outbox set status = 'failed', error = 'EMAIL_FROM missing' where id = $1", [row.id]);
    return { ok: false };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [mail.to],
        reply_to: settings.emailReplyTo ?? undefined,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        attachments: mail.attachments?.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content).toString("base64"),
          content_type: a.contentType,
        })),
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) throw new Error(body.message ?? `HTTP ${res.status}`);
    await q.query("update email_outbox set status = 'sent', provider_id = $2, sent_at = now() where id = $1", [row.id, body.id ?? null]);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message.slice(0, 300) : "unknown";
    await q.query("update email_outbox set status = 'failed', error = $2 where id = $1", [row.id, msg]);
    console.error(`[email] ${mail.template} failed (outbox ${row.id}): ${msg}`);
    return { ok: false };
  }
}

export function siteUrl(): string {
  return (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
