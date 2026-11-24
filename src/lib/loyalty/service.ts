import type { Db, Queryable } from "@/lib/db/types";
import { isUniqueViolation } from "@/lib/db/types";
import { audit } from "@/lib/audit";
import { getSettings } from "@/lib/settings";
import { randomCode, randomToken, sha256 } from "@/lib/security";

export class LoyaltyError extends Error {
  constructor(
    public code: "NOT_FOUND" | "INSUFFICIENT_STAMPS" | "INVALID" | "DISABLED" | "DUPLICATE",
    message: string,
  ) {
    super(message);
    this.name = "LoyaltyError";
  }
}

export type LoyaltyAccount = {
  id: string;
  customerId: string;
  cardCode: string;
  stamps: number;
  physicalCardLinked: boolean;
  fullName: string;
  email: string;
  phone: string;
  createdAt: Date;
};

export type LoyaltyTransaction = {
  id: string;
  type: "stamp" | "correction" | "redemption" | "migration";
  delta: number;
  balanceAfter: number;
  reason: string | null;
  createdAt: Date;
};

const ACCOUNT_SELECT = `
  select a.*, c.full_name, c.email, c.phone
    from loyalty_accounts a join customers c on c.id = a.customer_id`;

function mapAccount(r: Record<string, unknown>): LoyaltyAccount {
  return {
    id: r.id as string,
    customerId: r.customer_id as string,
    cardCode: r.card_code as string,
    stamps: r.stamps as number,
    physicalCardLinked: r.physical_card_linked as boolean,
    fullName: r.full_name as string,
    email: r.email as string,
    phone: r.phone as string,
    createdAt: new Date(r.created_at as string),
  };
}

export async function getAccount(q: Queryable, id: string) {
  const rows = await q.query(`${ACCOUNT_SELECT} where a.id = $1`, [id]);
  return rows[0] ? mapAccount(rows[0]) : null;
}

export async function getAccountByCustomer(q: Queryable, customerId: string) {
  const rows = await q.query(`${ACCOUNT_SELECT} where a.customer_id = $1`, [customerId]);
  return rows[0] ? mapAccount(rows[0]) : null;
}

export async function searchAccounts(q: Queryable, term: string, limit = 20) {
  const t = term.trim();
  if (!t) {
    const rows = await q.query(`${ACCOUNT_SELECT} where c.anonymized_at is null order by a.updated_at desc limit $1`, [limit]);
    return rows.map(mapAccount);
  }
  const like = `%${t.toLowerCase().replace(/[%_\\]/g, "\\$&")}%`;
  const rows = await q.query(
    `${ACCOUNT_SELECT}
      where c.anonymized_at is null
        and (lower(c.full_name) like $1 or lower(c.email) like $1 or c.phone like $1 or a.card_code = upper($2))
      order by c.full_name limit $3`,
    [like, t, limit],
  );
  return rows.map(mapAccount);
}

export async function getTransactions(q: Queryable, accountId: string, limit = 50): Promise<LoyaltyTransaction[]> {
  const rows = await q.query<Record<string, unknown>>(
    "select * from loyalty_transactions where account_id = $1 order by created_at desc limit $2",
    [accountId, limit],
  );
  return rows.map((r) => ({
    id: r.id as string,
    type: r.type as LoyaltyTransaction["type"],
    delta: r.delta as number,
    balanceAfter: r.balance_after as number,
    reason: (r.reason as string) ?? null,
    createdAt: new Date(r.created_at as string),
  }));
}

/** Creates (or returns) the loyalty account for a customer. */
export async function ensureAccount(db: Db, customerId: string, actor: { type: "admin" | "customer" | "system"; id?: string }) {
  const existing = await getAccountByCustomer(db, customerId);
  if (existing) return existing;
  for (let i = 0; i < 5; i++) {
    try {
      const id = await db.tx(async (q) => {
        const [row] = await q.query<{ id: string }>(
          "insert into loyalty_accounts (customer_id, card_code) values ($1, $2) returning id",
          [customerId, `HC-${randomCode(8)}`],
        );
        await audit(q, actor, "loyalty.account_created", "loyalty_account", row.id);
        return row.id;
      });
      return (await getAccount(db, id))!;
    } catch (err) {
      if (isUniqueViolation(err, "customer_id")) return (await getAccountByCustomer(db, customerId))!;
      if (isUniqueViolation(err)) continue; // card_code collision
      throw err;
    }
  }
  throw new Error("Could not allocate a card code.");
}

/** Find or create a customer by e-mail (admin flow: signing up a walk-in customer in the shop). */
export async function findOrCreateCustomer(db: Db, input: { fullName: string; email: string; phone: string }) {
  const email = input.email.trim().toLowerCase();
  await db.query(
    `insert into customers (full_name, email, phone) values ($1, $2, $3)
     on conflict (lower(email)) where anonymized_at is null do nothing`,
    [input.fullName.trim(), email, input.phone.trim()],
  );
  const [row] = await db.query<{ id: string }>("select id from customers where lower(email) = $1 and anonymized_at is null", [email]);
  return row.id;
}

type TxInput = {
  accountId: string;
  type: LoyaltyTransaction["type"];
  delta: number;
  reason?: string | null;
  bookingId?: string | null;
  adminUserId: string | null;
  idempotencyKey?: string | null;
};

/**
 * The single write path for stamp balances. Runs in one transaction with a row
 * lock on the account, never lets the balance go below zero, and is idempotent
 * per `idempotencyKey`.
 */
async function applyTransaction(db: Db, input: TxInput, redeem?: { stampsUsed: number; rewardText: string | null }) {
  if (!Number.isInteger(input.delta) || input.delta === 0) throw new LoyaltyError("INVALID", "Ungültige Stempelanzahl.");
  try {
    return await db.tx(async (q) => {
      if (input.idempotencyKey) {
        const dup = await q.query<{ id: string }>("select id from loyalty_transactions where idempotency_key = $1", [
          input.idempotencyKey,
        ]);
        if (dup[0]) return { duplicate: true as const, transactionId: dup[0].id };
      }
      const [acc] = await q.query<{ stamps: number }>("select stamps from loyalty_accounts where id = $1 for update", [
        input.accountId,
      ]);
      if (!acc) throw new LoyaltyError("NOT_FOUND", "Kundenkarte nicht gefunden.");
      const balance = acc.stamps + input.delta;
      if (balance < 0) throw new LoyaltyError("INSUFFICIENT_STAMPS", "Nicht genügend Stempel.");

      let rewardId: string | null = null;
      if (redeem) {
        const [reward] = await q.query<{ id: string }>(
          "insert into loyalty_rewards (account_id, stamps_used, reward_text, admin_user_id) values ($1, $2, $3, $4) returning id",
          [input.accountId, redeem.stampsUsed, redeem.rewardText, input.adminUserId],
        );
        rewardId = reward.id;
      }
      const [tx] = await q.query<{ id: string }>(
        `insert into loyalty_transactions (account_id, type, delta, balance_after, reason, booking_id, reward_id, admin_user_id, idempotency_key)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
        [
          input.accountId,
          input.type,
          input.delta,
          balance,
          input.reason?.trim() || null,
          input.bookingId ?? null,
          rewardId,
          input.adminUserId,
          input.idempotencyKey ?? null,
        ],
      );
      await q.query("update loyalty_accounts set stamps = $2, updated_at = now() where id = $1", [input.accountId, balance]);
      await audit(
        q,
        input.adminUserId ? { type: "admin", id: input.adminUserId } : { type: "system" },
        `loyalty.${input.type}`,
        "loyalty_account",
        input.accountId,
        { delta: input.delta, balance, reason: input.reason ?? null, rewardId },
      );
      return { duplicate: false as const, transactionId: tx.id, balance, rewardId };
    });
  } catch (err) {
    if (isUniqueViolation(err, "idempotency_key")) return { duplicate: true as const, transactionId: null };
    if (isUniqueViolation(err, "loyalty_tx_booking_stamp_key")) {
      throw new LoyaltyError("DUPLICATE", "Für diesen Termin wurde bereits ein Stempel vergeben.");
    }
    throw err;
  }
}

export async function awardStamp(db: Db, args: { accountId: string; adminUserId: string; idempotencyKey: string; count?: number }) {
  const count = args.count ?? 1;
  if (count < 1 || count > 5) throw new LoyaltyError("INVALID", "Es können 1 bis 5 Stempel auf einmal vergeben werden.");
  return applyTransaction(db, {
    accountId: args.accountId,
    type: "stamp",
    delta: count,
    reason: count > 1 ? `${count} Stempel` : null,
    adminUserId: args.adminUserId,
    idempotencyKey: args.idempotencyKey,
  });
}

export async function correctBalance(
  db: Db,
  args: { accountId: string; delta: number; reason: string; adminUserId: string; idempotencyKey: string },
) {
  if (!args.reason?.trim()) throw new LoyaltyError("INVALID", "Für Korrekturen ist eine Begründung erforderlich.");
  return applyTransaction(db, { ...args, type: "correction" });
}

export async function migratePhysicalStamps(
  db: Db,
  args: { accountId: string; count: number; reason?: string; adminUserId: string; idempotencyKey: string },
) {
  if (args.count < 1 || args.count > 50) throw new LoyaltyError("INVALID", "Ungültige Anzahl.");
  const result = await applyTransaction(db, {
    accountId: args.accountId,
    type: "migration",
    delta: args.count,
    reason: args.reason?.trim() || "Übertrag von der Papier-Stempelkarte",
    adminUserId: args.adminUserId,
    idempotencyKey: args.idempotencyKey,
  });
  await db.query("update loyalty_accounts set physical_card_linked = true where id = $1", [args.accountId]);
  return result;
}

export async function redeemReward(db: Db, args: { accountId: string; adminUserId: string; idempotencyKey: string }) {
  const settings = await getSettings(db);
  if (!settings.loyaltyEnabled) throw new LoyaltyError("DISABLED", "Der Kundenclub ist deaktiviert.");
  const required = settings.loyaltyStampsRequired;
  return applyTransaction(
    db,
    {
      accountId: args.accountId,
      type: "redemption",
      delta: -required,
      reason: "Belohnung eingelöst",
      adminUserId: args.adminUserId,
      idempotencyKey: args.idempotencyKey,
    },
    { stampsUsed: required, rewardText: settings.loyaltyRewardText },
  );
}

/**
 * Called when an admin marks a booking as completed. Only awards a stamp when
 * the owner explicitly enabled the rule AND the customer has a loyalty account.
 */
export async function stampForCompletedBooking(db: Db, bookingId: string, adminUserId: string | null) {
  const settings = await getSettings(db);
  if (!settings.loyaltyEnabled || !settings.loyaltyAutoStampOnComplete) return null;
  const [b] = await db.query<{ customer_id: string; status: string }>("select customer_id, status from bookings where id = $1", [
    bookingId,
  ]);
  if (!b || b.status !== "completed") return null;
  const account = await getAccountByCustomer(db, b.customer_id);
  if (!account) return null;
  try {
    return await applyTransaction(db, {
      accountId: account.id,
      type: "stamp",
      delta: 1,
      reason: "Termin abgeschlossen",
      bookingId,
      adminUserId,
      idempotencyKey: `booking-stamp:${bookingId}`,
    });
  } catch (err) {
    if (err instanceof LoyaltyError && err.code === "DUPLICATE") return null;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Customer access links (no customer accounts/passwords needed)
// ---------------------------------------------------------------------------

export async function createAccessLink(db: Db, email: string, ttlMinutes = 60 * 24 * 7) {
  const [c] = await db.query<{ id: string; full_name: string }>(
    "select c.id, c.full_name from customers c join loyalty_accounts a on a.customer_id = c.id where lower(c.email) = $1 and c.anonymized_at is null",
    [email.trim().toLowerCase()],
  );
  if (!c) return null;
  const token = randomToken();
  await db.query("insert into customer_access_tokens (customer_id, token_hash, purpose, expires_at) values ($1, $2, 'loyalty', $3)", [
    c.id,
    sha256(token),
    new Date(Date.now() + ttlMinutes * 60_000).toISOString(),
  ]);
  return { token, customerName: c.full_name };
}

export async function getAccountByAccessToken(q: Queryable, token: string, now = new Date()) {
  if (!token || token.length < 32 || token.length > 128) return null;
  const [t] = await q.query<{ customer_id: string }>(
    "select customer_id from customer_access_tokens where token_hash = $1 and purpose = 'loyalty' and expires_at > $2",
    [sha256(token), now.toISOString()],
  );
  if (!t) return null;
  return getAccountByCustomer(q, t.customer_id);
}
