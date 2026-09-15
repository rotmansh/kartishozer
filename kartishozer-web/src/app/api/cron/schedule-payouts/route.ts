import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Runs daily (see vercel.json) to release seller proceeds — but only once
 * an order is old enough to trust: `payout_delay_days` after the event
 * date, never the moment an order is PAID. That's the whole point of the
 * delay — a dispute can still be raised on a PAID order right up until
 * this job promotes it, at which point the ledger's own audit trail
 * (SELLER_PROCEEDS) is used verbatim rather than recomputed, so the
 * payout always matches what was actually recorded at sale time. This
 * only *schedules* a Payout (status PENDING) — an admin still approves
 * the actual transfer from /admin/payouts, exactly like a disputed
 * order's manual payout already does.
 */
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const delayConfig = await db.platformConfig.findUnique({ where: { key: "payout_delay_days" } });
  const delayDays = Number(delayConfig?.value ?? 3);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - delayDays);

  const eligibleOrders = await db.order.findMany({
    where: {
      status: "PAID",
      event: { startsAt: { lte: cutoff } },
      payouts: { none: {} },
    },
    select: { id: true, vendorId: true },
  });

  let scheduled = 0;
  const skippedNoLedgerEntry: string[] = [];

  for (const order of eligibleOrders) {
    const ledgerEntry = await db.ledgerEntry.findFirst({
      where: { orderId: order.id, type: "SELLER_PROCEEDS" },
    });
    if (!ledgerEntry) {
      skippedNoLedgerEntry.push(order.id);
      continue;
    }

    await db.$transaction([
      db.order.update({ where: { id: order.id }, data: { status: "CONFIRMED" } }),
      db.payout.create({
        data: {
          orderId: order.id,
          vendorId: order.vendorId,
          amountAgorot: ledgerEntry.amountAgorot,
          status: "PENDING",
          trigger: "AUTO",
          scheduledFor: new Date(),
        },
      }),
    ]);
    scheduled++;
  }

  return NextResponse.json({ checked: eligibleOrders.length, scheduled, skippedNoLedgerEntry });
}
