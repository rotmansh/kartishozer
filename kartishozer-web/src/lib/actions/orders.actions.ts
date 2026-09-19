"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAppUser } from "@/lib/auth/server";
import { getPaymentProvider } from "@/lib/payments/provider.factory";
import { computeOrderTotals, getPlatformFees } from "@/lib/queries/catalog";
import { recordPaymentFunnelEvent, recordTicketReceivedConfirmed } from "@/lib/analytics";
import { PRICING_VERSION } from "@/lib/pricingVersion";
import { checkRateLimit } from "@/lib/rateLimit";

type CreateOrderResult = { orderId: string } | { error: string };
type ActionResult = { success: true } | { error: string };

/**
 * Buying a listing can now buy a subset of its quantity (see the checkout
 * UI's quantity stepper) — priceAgorot/faceValueAgorot on Listing are
 * always "total for however many tickets are currently listed" (never a
 * per-unit price; see checkMarkupAllowed/assessListingRisk, which compare
 * them directly with no multiplication), so a partial purchase pays a
 * proportional slice of the current total and the remaining Listing row
 * has both its quantity and its total price/face-value reduced by that
 * same slice — every other reader of Listing.priceAgorot keeps working
 * unchanged, since the field's meaning never changes, only its value.
 * Payment goes through the mock provider only (see src/lib/payments), no
 * real charge.
 */
export async function createOrderAction(listingId: string, requestedQuantity: number): Promise<CreateOrderResult> {
  const user = await getAppUser();
  if (!user) return { error: "יש להתחבר כדי לבצע רכישה" };

  if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
    return { error: "כמות לא תקינה" };
  }

  // Protects against hammering the payment provider (a real one would
  // charge per attempt) — generous enough that no real buyer ever
  // notices it.
  if (!(await checkRateLimit(`createOrder:${user.id}`, 10, 10 * 60_000))) {
    return { error: "יותר מדי ניסיונות רכישה בזמן קצר — נסו שוב בעוד כמה דקות" };
  }

  const listing = await db.listing.findFirst({
    where: { id: listingId, status: "ACTIVE", deletedAt: null },
    include: { vendor: true },
  });
  if (!listing) return { error: "הכרטיס אינו זמין יותר" };
  if (listing.vendor.userId === user.id) {
    return { error: "לא ניתן לקנות כרטיס שפרסמתם בעצמכם" };
  }
  if (requestedQuantity > listing.quantity) {
    return { error: "הכמות המבוקשת אינה זמינה יותר במודעה זו" };
  }

  // Rounded once here, then the remaining listing gets exactly
  // (original - this slice) by subtraction rather than its own separate
  // rounding — so repeated partial sales of the same listing can never
  // drift the total away from what was originally listed.
  const subtotalPriceAgorot = Math.round((listing.priceAgorot * requestedQuantity) / listing.quantity);
  const subtotalFaceValueAgorot = Math.round((listing.faceValueAgorot * requestedQuantity) / listing.quantity);
  const remainingQuantity = listing.quantity - requestedQuantity;

  const totals = await computeOrderTotals(subtotalPriceAgorot);
  const fees = await getPlatformFees();
  const sellerFeeAgorot = Math.round((subtotalPriceAgorot * fees.sellerFeePercent) / 100);
  const sellerProceedsAgorot = subtotalPriceAgorot - sellerFeeAgorot;

  await recordPaymentFunnelEvent({ type: "PAYMENT_STARTED", listingId, userId: user.id });

  const provider = getPaymentProvider();
  const intent = await provider.createIntent({
    amountAgorot: totals.totalAgorot,
    currency: "ILS",
    metadata: { listingId, buyerId: user.id },
  });
  const confirmed = await provider.confirmIntent(intent.providerIntentId);
  if (confirmed.status !== "SUCCEEDED") {
    await recordPaymentFunnelEvent({
      type: "PAYMENT_FAILED",
      listingId,
      userId: user.id,
      metadata: { providerStatus: confirmed.status },
    });
    return { error: "התשלום נכשל, נסו שוב" };
  }

  const order = await db.$transaction(async (tx) => {
    // Conditional on the exact quantity/status just read — if another
    // buyer bought some or all of this listing in the meantime, this
    // matches zero rows instead of overselling past what's actually left.
    const guarded = await tx.listing.updateMany({
      where: { id: listing.id, status: "ACTIVE", quantity: listing.quantity },
      data: {
        quantity: remainingQuantity,
        priceAgorot: listing.priceAgorot - subtotalPriceAgorot,
        faceValueAgorot: listing.faceValueAgorot - subtotalFaceValueAgorot,
        status: remainingQuantity === 0 ? "SOLD" : "ACTIVE",
      },
    });
    if (guarded.count === 0) {
      throw new Error("LISTING_CHANGED");
    }

    const created = await tx.order.create({
      data: {
        listingId: listing.id,
        eventId: listing.eventId,
        buyerId: user.id,
        vendorId: listing.vendorId,
        quantity: requestedQuantity,
        priceAgorot: subtotalPriceAgorot,
        faceValueAgorot: subtotalFaceValueAgorot,
        buyerFeeAgorot: totals.buyerFeeAgorot,
        totalAgorot: totals.totalAgorot,
        status: "PAID",
        buyerName: user.fullName,
        buyerEmail: user.email,
        providerIntentId: intent.providerIntentId,
        paidAt: new Date(),
      },
    });

    await tx.ledgerEntry.createMany({
      data: [
        {
          orderId: created.id,
          type: "PLATFORM_FEE_BUYER",
          amountAgorot: totals.buyerFeeAgorot,
          debitAccount: "BUYER",
          creditAccount: "PLATFORM_REVENUE",
        },
        // Previously only implicit inside SELLER_PROCEEDS below (proceeds
        // = price - this fee) — recorded as its own line now so total
        // platform revenue is reconstructable from LedgerEntry alone,
        // without changing what the seller actually nets.
        {
          orderId: created.id,
          type: "PLATFORM_FEE_SELLER",
          amountAgorot: sellerFeeAgorot,
          debitAccount: "PLATFORM_ESCROW",
          creditAccount: "PLATFORM_REVENUE",
        },
        {
          orderId: created.id,
          type: "SELLER_PROCEEDS",
          amountAgorot: sellerProceedsAgorot,
          debitAccount: "PLATFORM_ESCROW",
          creditAccount: "SELLER_PENDING",
        },
      ],
    });

    // The permanent, independent pricing record — see OrderPricing's own
    // doc comment. Written from the exact same fee/total numbers already
    // computed above, never recomputed from *current* config later, so a
    // future change to buyer_fee_percent/seller_fee_percent (or an
    // entirely new PRICING_VERSION) can never alter what this order is
    // understood to have been priced under.
    await tx.orderPricing.create({
      data: {
        orderId: created.id,
        pricingVersion: PRICING_VERSION,
        buyerFeePercent: fees.buyerFeePercent,
        sellerFeePercent: fees.sellerFeePercent,
        buyerFeeAgorot: totals.buyerFeeAgorot,
        sellerFeeAgorot,
        totalPaidByBuyerAgorot: totals.totalAgorot,
        amountDueToSellerAgorot: sellerProceedsAgorot,
        platformRevenueAgorot: totals.buyerFeeAgorot + sellerFeeAgorot,
      },
    });

    // A conversation exists for every order from the moment it's paid —
    // this is how the buyer and seller actually coordinate handing over
    // the ticket (no file upload/barcode transfer exists yet), so it
    // can't be something either side has to remember to start.
    await tx.conversation.create({
      data: { orderId: created.id, buyerId: user.id, sellerId: listing.vendor.userId },
    });

    // The mock provider confirms synchronously in one step (no separate
    // authorization held before a later capture), so only this one event
    // fires today — PAYMENT_INITIATED/PAYMENT_AUTHORIZED exist in the enum
    // for when a real, asynchronous processor is wired in.
    await tx.paymentEvent.create({
      data: {
        orderId: created.id,
        type: "PAYMENT_CAPTURED",
        provider: provider.name,
        providerReference: intent.providerIntentId,
        amountAgorot: totals.totalAgorot,
        status: confirmed.status,
      },
    });

    return created;
  }).catch((err) => {
    if (err instanceof Error && err.message === "LISTING_CHANGED") return null;
    throw err;
  });

  if (!order) {
    // The payment "succeeded" against the mock provider, but no Order/
    // ledger rows were ever created — nothing to reconcile or refund,
    // since nothing real was charged (see the module doc comment).
    return { error: "המודעה השתנתה בזמן שביצעתם את הרכישה — נסו שוב" };
  }

  revalidatePath("/profile");
  revalidatePath(`/listing/${listing.id}`);
  revalidatePath(`/event/${listing.eventId}`);

  return { orderId: order.id };
}

/**
 * The buyer's own explicit "I got the ticket" signal — previously
 * nothing in the app ever set OrderStatus.TICKET_DELIVERED at all,
 * despite it being a real status in the schema; the buyer/seller only
 * ever coordinated informally over the order's chat. Deliberately does
 * NOT change payout timing — schedule-payouts still releases money on
 * its own delay-based schedule regardless of this confirmation (see
 * that route's own matching update to accept this status too), so an
 * early confirmation can't be used to rush a payout ahead of the
 * dispute window. This is a data/trust signal, not a financial trigger.
 */
export async function confirmTicketReceivedAction(orderId: string): Promise<ActionResult> {
  const user = await getAppUser();
  if (!user) return { error: "יש להתחבר" };

  const order = await db.order.findUnique({ where: { id: orderId }, select: { buyerId: true, status: true } });
  if (!order || order.buyerId !== user.id) return { error: "ההזמנה לא נמצאה" };
  if (order.status !== "PAID") return { error: "לא ניתן לאשר קבלה בשלב זה" };

  await db.order.update({ where: { id: orderId }, data: { status: "TICKET_DELIVERED" } });
  await recordTicketReceivedConfirmed({ orderId, userId: user.id });

  revalidatePath("/profile");
  return { success: true };
}

// Reviewable once the buyer has confirmed receipt (TICKET_DELIVERED) or the
// order has since settled (CONFIRMED) — not merely PAID, since the buyer
// hasn't said the transaction actually went fine yet, and not DISPUTED/
// REFUNDED/CANCELLED, which already say it didn't.
const REVIEWABLE_ORDER_STATUSES = ["TICKET_DELIVERED", "CONFIRMED"] as const;

export async function submitSellerReviewAction(input: {
  orderId: string;
  rating: number;
  comment?: string;
}): Promise<ActionResult> {
  const user = await getAppUser();
  if (!user) return { error: "יש להתחבר" };

  const rating = Math.trunc(input.rating);
  if (rating < 1 || rating > 5) return { error: "דירוג לא תקין" };

  const order = await db.order.findUnique({
    where: { id: input.orderId },
    select: { id: true, buyerId: true, vendorId: true, status: true },
  });
  if (!order || order.buyerId !== user.id) return { error: "ההזמנה לא נמצאה" };
  if (!REVIEWABLE_ORDER_STATUSES.includes(order.status as (typeof REVIEWABLE_ORDER_STATUSES)[number])) {
    return { error: "ניתן לדרג רק לאחר קבלת הכרטיס" };
  }

  const existing = await db.sellerReview.findUnique({ where: { orderId: order.id } });
  if (existing) return { error: "כבר דירגתם את ההזמנה הזו" };

  await db.sellerReview.create({
    data: {
      orderId: order.id,
      buyerId: user.id,
      vendorId: order.vendorId,
      rating,
      comment: input.comment?.trim() || null,
    },
  });

  revalidatePath("/profile");
  return { success: true };
}
