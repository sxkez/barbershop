import "server-only";
import { createDbFromEnv } from "./factory";
import type { Db } from "./types";

export type { Db, Queryable } from "./types";
export { isUniqueViolation, isExclusionViolation } from "./types";

const globalForDb = globalThis as unknown as { __haniDb?: Promise<Db> };

/** Shared database handle for the running server (one per process). */
export function getDb(): Promise<Db> {
  if (!globalForDb.__haniDb) {
    globalForDb.__haniDb = createDbFromEnv().catch((err) => {
      globalForDb.__haniDb = undefined;
      throw err;
    });
  }
  return globalForDb.__haniDb;
}
