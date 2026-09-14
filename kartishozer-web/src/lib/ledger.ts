import { db } from "@/lib/db";

/** Records a full (or partial) refund to the buyer as a ledger entry. */
export async function recordFullRefund(orderId: string, amountAgorot: number, reason: string) {
  await db.ledgerEntry.create({
    data: {
      orderId,
      type: "REFUND_BUYER",
      amountAgorot,
      debitAccount: "PLATFORM_ESCROW",
      creditAccount: `BUYER_REFUND:${reason}`,
    },
  });
}
