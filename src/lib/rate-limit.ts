import type { Queryable } from "@/lib/db/types";
import { sha256 } from "@/lib/security";

/**
 * Fixed-window rate limiter stored in Postgres, so it also works across
 * serverless instances. The client identifier is hashed before storage.
 */
export async function rateLimit(
  q: Queryable,
  opts: { bucket: string; identifier: string; limit: number; windowSeconds: number; now?: Date },
): Promise<{ allowed: boolean; remaining: number }> {
  const now = opts.now ?? new Date();
  const windowMs = opts.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const key = `${opts.bucket}:${sha256(`${opts.identifier}|${process.env.SESSION_SECRET ?? "hani"}`).slice(0, 32)}`;
  const [row] = await q.query<{ count: number }>(
    `insert into rate_limits (key, window_start, count) values ($1, $2, 1)
     on conflict (key, window_start) do update set count = rate_limits.count + 1
     returning count`,
    [key, windowStart.toISOString()],
  );
  // Opportunistic cleanup of stale windows.
  if (Math.random() < 0.02) {
    await q.query("delete from rate_limits where window_start < $1", [new Date(now.getTime() - 86_400_000).toISOString()]);
  }
  return { allowed: row.count <= opts.limit, remaining: Math.max(0, opts.limit - row.count) };
}
