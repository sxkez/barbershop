import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db/types";
import {
  awardStamp,
  correctBalance,
  createAccessLink,
  ensureAccount,
  findOrCreateCustomer,
  getAccount,
  getAccountByAccessToken,
  getTransactions,
  migratePhysicalStamps,
  redeemReward,
  stampForCompletedBooking,
} from "@/lib/loyalty/service";
import { adminSetStatus, createBooking } from "@/lib/booking/service";
import { NOW, bookingInput, freshDb, serviceId } from "./helpers";

const ADMIN = "00000000-0000-4000-8000-000000000001";
let db: Db;

beforeAll(async () => {
  db = await freshDb();
});
afterAll(async () => db.close());

async function newAccount(email = `club+${randomUUID().slice(0, 8)}@example.test`) {
  const customerId = await findOrCreateCustomer(db, { fullName: "Club Kunde", email, phone: "+49 170 1111111" });
  return ensureAccount(db, customerId, { type: "admin", id: ADMIN });
}

describe("loyalty integrity", () => {
  it("awards stamps and records history", async () => {
    const acc = await newAccount();
    await awardStamp(db, { accountId: acc.id, adminUserId: ADMIN, idempotencyKey: randomUUID() });
    await awardStamp(db, { accountId: acc.id, adminUserId: ADMIN, idempotencyKey: randomUUID() });
    expect((await getAccount(db, acc.id))!.stamps).toBe(2);
    const history = await getTransactions(db, acc.id);
    expect(history).toHaveLength(2);
    expect(history[0].balanceAfter).toBe(2);
  });

  it("the same request (idempotency key) never awards twice", async () => {
    const acc = await newAccount();
    const key = randomUUID();
    await Promise.all([1, 2, 3].map(() => awardStamp(db, { accountId: acc.id, adminUserId: ADMIN, idempotencyKey: key })));
    expect((await getAccount(db, acc.id))!.stamps).toBe(1);
  });

  it("balance can never go negative", async () => {
    const acc = await newAccount();
    await expect(
      correctBalance(db, { accountId: acc.id, delta: -1, reason: "Fehler", adminUserId: ADMIN, idempotencyKey: randomUUID() }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STAMPS" });
  });

  it("corrections require a reason", async () => {
    const acc = await newAccount();
    await expect(
      correctBalance(db, { accountId: acc.id, delta: 1, reason: " ", adminUserId: ADMIN, idempotencyKey: randomUUID() }),
    ).rejects.toMatchObject({ code: "INVALID" });
  });

  it("redemption requires enough stamps", async () => {
    const acc = await newAccount();
    await migratePhysicalStamps(db, { accountId: acc.id, count: 9, adminUserId: ADMIN, idempotencyKey: randomUUID() });
    await expect(redeemReward(db, { accountId: acc.id, adminUserId: ADMIN, idempotencyKey: randomUUID() })).rejects.toMatchObject({
      code: "INSUFFICIENT_STAMPS",
    });
    expect((await getAccount(db, acc.id))!.physicalCardLinked).toBe(true);
  });

  it("duplicate redemption (same request) creates one reward only", async () => {
    const acc = await newAccount();
    await migratePhysicalStamps(db, { accountId: acc.id, count: 10, adminUserId: ADMIN, idempotencyKey: randomUUID() });
    const key = randomUUID();
    await redeemReward(db, { accountId: acc.id, adminUserId: ADMIN, idempotencyKey: key });
    await redeemReward(db, { accountId: acc.id, adminUserId: ADMIN, idempotencyKey: key });
    expect((await getAccount(db, acc.id))!.stamps).toBe(0);
    const [{ count }] = await db.query<{ count: number }>(
      "select count(*)::int as count from loyalty_rewards where account_id = $1",
      [acc.id],
    );
    expect(count).toBe(1);
  });

  it("concurrent redemptions with only one reward's worth of stamps: one succeeds", async () => {
    const acc = await newAccount();
    await migratePhysicalStamps(db, { accountId: acc.id, count: 12, adminUserId: ADMIN, idempotencyKey: randomUUID() });
    const results = await Promise.allSettled(
      [1, 2].map(() => redeemReward(db, { accountId: acc.id, adminUserId: ADMIN, idempotencyKey: randomUUID() })),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await getAccount(db, acc.id))!.stamps).toBe(2);
  });

  it("every change is audited", async () => {
    const acc = await newAccount();
    await awardStamp(db, { accountId: acc.id, adminUserId: ADMIN, idempotencyKey: randomUUID() });
    const rows = await db.query<{ action: string; actor_id: string }>(
      "select action, actor_id from audit_logs where entity = 'loyalty_account' and entity_id = $1 order by id",
      [acc.id],
    );
    expect(rows.map((r) => r.action)).toEqual(["loyalty.account_created", "loyalty.stamp"]);
    expect(rows[1].actor_id).toBe(ADMIN);
  });

  it("completed appointments do NOT earn stamps unless the owner enables it; never twice", async () => {
    const email = `auto+${randomUUID().slice(0, 8)}@example.test`;
    const acc = await newAccount(email);
    const classic = await serviceId(db, "paket-1-classic");
    const b = await createBooking(db, bookingInput(classic, "2027-01-04", "10:00", { email }), { now: NOW });
    await adminSetStatus(db, { bookingId: b.booking.id, status: "completed", adminId: ADMIN, now: NOW });

    expect(await stampForCompletedBooking(db, b.booking.id, ADMIN)).toBeNull();
    expect((await getAccount(db, acc.id))!.stamps).toBe(0);

    await db.query("update business_settings set loyalty_auto_stamp_on_complete = true");
    await stampForCompletedBooking(db, b.booking.id, ADMIN);
    await stampForCompletedBooking(db, b.booking.id, ADMIN);
    expect((await getAccount(db, acc.id))!.stamps).toBe(1);
    await db.query("update business_settings set loyalty_auto_stamp_on_complete = false");
  });

  it("customer access links work, expire and reveal nothing for unknown e-mails", async () => {
    const email = `link+${randomUUID().slice(0, 8)}@example.test`;
    const acc = await newAccount(email);
    expect(await createAccessLink(db, "unknown@example.test")).toBeNull();
    const link = await createAccessLink(db, email, 10);
    expect(link).not.toBeNull();
    expect((await getAccountByAccessToken(db, link!.token))!.id).toBe(acc.id);
    expect(await getAccountByAccessToken(db, link!.token, new Date(Date.now() + 11 * 60_000))).toBeNull();
    expect(await getAccountByAccessToken(db, acc.cardCode)).toBeNull();
  });
});
