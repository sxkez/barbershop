export interface Queryable {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

export interface Db extends Queryable {
  /** Runs `fn` inside a single database transaction (BEGIN … COMMIT / ROLLBACK). */
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
  /** Executes a multi-statement SQL script (migrations / seed only — never with user input). */
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
  readonly kind: "postgres" | "pglite";
}

function pgCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

/** 23505 unique_violation */
export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  if (pgCode(err) !== "23505") return false;
  if (!constraint) return true;
  const c = (err as { constraint?: string }).constraint;
  const msg = err instanceof Error ? err.message : "";
  return c === constraint || msg.includes(constraint);
}

/** 23P01 exclusion_violation — raised by bookings_no_overlap */
export function isExclusionViolation(err: unknown): boolean {
  return pgCode(err) === "23P01";
}
