"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  awardStamp,
  correctBalance,
  ensureAccount,
  findOrCreateCustomer,
  LoyaltyError,
  migratePhysicalStamps,
  redeemReward,
} from "@/lib/loyalty/service";
import { customerFields } from "@/lib/validation";
import { done, errMsg, int, str } from "./_helpers";

function key(fd: FormData) {
  const k = str(fd, "idempotencyKey");
  if (!/^[0-9a-f-]{36}$/i.test(k)) throw new LoyaltyError("INVALID", "Formular abgelaufen – bitte Seite neu laden.");
  return k;
}

export async function createMemberAction(fd: FormData) {
  const admin = await requireAdmin();
  const parsed = z.object(customerFields).safeParse({ fullName: str(fd, "fullName"), email: str(fd, "email"), phone: str(fd, "phone") });
  if (!parsed.success) done("/admin/kundenclub", { error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen." });
  let id: string;
  try {
    const db = await getDb();
    const customerId = await findOrCreateCustomer(db, parsed.data!);
    id = (await ensureAccount(db, customerId, { type: "admin", id: admin.userId })).id;
  } catch (err) {
    done("/admin/kundenclub", { error: errMsg(err) });
  }
  done(`/admin/kundenclub/${id}`, { ok: "Kundenkarte angelegt." });
}

export async function loyaltyAction(fd: FormData) {
  const admin = await requireAdmin();
  const accountId = str(fd, "accountId");
  const op = str(fd, "op");
  const back = `/admin/kundenclub/${accountId}`;
  let msg = "";
  try {
    const db = await getDb();
    const idempotencyKey = key(fd);
    let res: { duplicate: boolean };
    if (op === "stamp") {
      res = await awardStamp(db, { accountId, adminUserId: admin.userId, idempotencyKey, count: int(fd, "count") ?? 1 });
      msg = "Stempel vergeben.";
    } else if (op === "redeem") {
      res = await redeemReward(db, { accountId, adminUserId: admin.userId, idempotencyKey });
      msg = "Belohnung eingelöst.";
    } else if (op === "correct") {
      const delta = int(fd, "delta");
      if (!delta) throw new LoyaltyError("INVALID", "Bitte eine Anzahl ungleich 0 angeben.");
      res = await correctBalance(db, { accountId, delta, reason: str(fd, "reason"), adminUserId: admin.userId, idempotencyKey });
      msg = "Korrektur gespeichert.";
    } else if (op === "migrate") {
      res = await migratePhysicalStamps(db, {
        accountId,
        count: int(fd, "count") ?? 0,
        reason: str(fd, "reason"),
        adminUserId: admin.userId,
        idempotencyKey,
      });
      msg = "Stempel von der Papierkarte übertragen.";
    } else {
      throw new LoyaltyError("INVALID", "Unbekannte Aktion.");
    }
    if (res.duplicate) msg = "Bereits ausgeführt (doppeltes Absenden wurde ignoriert).";
  } catch (err) {
    done(back, { error: errMsg(err) });
  }
  done(back, { ok: msg });
}
