"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAppUser } from "@/lib/auth/server";
import type { OrderStatus } from "@prisma/client";

type ActionResult<T = { success: true }> = T | { error: string };

// TICKET_DELIVERED is never actually set anywhere in the app today (the
// buyer/seller hand off the ticket over the order's chat, not a tracked
// state), but it's a legitimate future state to allow a dispute from, so
// it's included here even though only PAID/CONFIRMED occur in practice.
const DISPUTABLE_ORDER_STATUSES: OrderStatus[] = ["PAID", "CONFIRMED", "TICKET_DELIVERED"];

const openDisputeSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().min(10, "נא לתאר את הבעיה בפירוט (לפחות 10 תווים)").max(1000),
});

/**
 * The buyer-facing "הכרטיס לא עבד" flow. Opening a dispute freezes the
 * escrowed money immediately, in two ways at once rather than relying on
 * just one: flipping the order to DISPUTED takes it out of the pool
 * schedule-payouts ever looks at (that cron only selects status "PAID"),
 * and any payout already scheduled for this order (created earlier by
 * that same cron once the event passed, or the admin's manual flow, before
 * the buyer even noticed a problem) is put ON_HOLD explicitly here since
 * the status change alone wouldn't touch a Payout row that already exists.
 * An admin resolves the dispute from /admin/disputes — see
 * resolveDisputeAction — which is what actually pays the seller or
 * refunds the buyer.
 */
export async function openDisputeAction(
  input: z.infer<typeof openDisputeSchema>
): Promise<ActionResult<{ disputeId: string }>> {
  const user = await getAppUser();
  if (!user) return { error: "יש להתחבר כדי לפתוח פנייה" };

  const parsed = openDisputeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "פרטים לא תקינים" };
  const { orderId, reason } = parsed.data;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      payouts: { where: { status: "PENDING" }, select: { id: true } },
      disputes: { where: { status: { in: ["OPEN", "UNDER_REVIEW"] } }, select: { id: true } },
    },
  });

  if (!order || order.buyerId !== user.id) return { error: "ההזמנה לא נמצאה" };
  if (!DISPUTABLE_ORDER_STATUSES.includes(order.status)) {
    return { error: "לא ניתן לפתוח פנייה על הזמנה בסטטוס זה" };
  }
  if (order.disputes.length > 0) {
    return { error: "כבר פתוחה פנייה על ההזמנה הזו — צוות התמיכה כבר מטפל בה" };
  }

  const dispute = await db.$transaction(async (tx) => {
    const created = await tx.dispute.create({
      data: {
        orderId: order.id,
        type: "TICKET_INVALID",
        reason,
        status: "OPEN",
        requestedById: user.id,
      },
    });

    await tx.order.update({ where: { id: order.id }, data: { status: "DISPUTED" } });

    if (order.payouts.length > 0) {
      await tx.payout.updateMany({
        where: { id: { in: order.payouts.map((p) => p.id) } },
        data: { status: "ON_HOLD", failureReason: `הוקפא אוטומטית — מחלוקת פתוחה (${created.id})` },
      });
    }

    return created;
  });

  revalidatePath("/profile");
  revalidatePath("/admin/disputes");
  revalidatePath("/admin/payouts");

  return { disputeId: dispute.id };
}
