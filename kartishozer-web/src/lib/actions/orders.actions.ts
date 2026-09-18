"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAppUser } from "@/lib/auth/server";
import { getPaymentProvider } from "@/lib/payments/provider.factory";
import { computeOrderTotals, getPlatformFees } from "@/lib/queries/catalog";
import { recordPaymentFunnelEvent } from "@/lib/analytics";

type CreateOrderResult = { orderId: string } | { error: string };

/**
 * Buying a listing buys the whole thing (matches the existing checkout UI,
 * which has no partial-quantity selector) — payment goes through the mock
 * provider only (see src/lib/payments), no real charge.
 */
export async function createOrderAction(listingId: string): Promise<CreateOrderResult> {
  const user = await getAppUser();
  if (!user) return { error: "יש להתחבר כדי לבצע רכישה" };

  const listing = await db.listing.findFirst({
    where: { id: listingId, status: "ACTIVE", deletedAt: null },
    include: { vendor: true },
  });
  if (!listing) return { error: "הכרטיס אינו זמין יותר" };
  if (listing.vendor.userId === user.id) {
    return { error: "לא ניתן לקנות כרטיס שפרסמתם בעצמכם" };
  }

  const totals = await computeOrderTotals(listing.priceAgorot);
  const fees = await getPlatformFees();
  const sellerFeeAgorot = Math.round((listing.priceAgorot * fees.sellerFeePercent) / 100);
  const sellerProceedsAgorot = listing.priceAgorot - sellerFeeAgorot;

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
    const created = await tx.order.create({
      data: {
        listingId: listing.id,
        eventId: listing.eventId,
        buyerId: user.id,
        vendorId: listing.vendorId,
        quantity: listing.quantity,
        priceAgorot: listing.priceAgorot,
        buyerFeeAgorot: totals.buyerFeeAgorot,
        totalAgorot: totals.totalAgorot,
        status: "PAID",
        buyerName: user.fullName,
        buyerEmail: user.email,
        providerIntentId: intent.providerIntentId,
        paidAt: new Date(),
      },
    });

    await tx.listing.update({
      where: { id: listing.id },
      data: { status: "SOLD" },
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
  });

  revalidatePath("/profile");
  revalidatePath(`/listing/${listing.id}`);
  revalidatePath(`/event/${listing.eventId}`);

  return { orderId: order.id };
}
