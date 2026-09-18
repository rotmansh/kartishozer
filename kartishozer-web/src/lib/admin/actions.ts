"use server";

// ============================================================
// Admin — Server Actions
// All actions require ADMIN role (verified server-side, on every
// call — never rely solely on the page-level guard). Every action
// writes to AuditLog.
// ============================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAppUser, isAdmin } from "@/lib/auth/server";
import { getPaymentProvider } from "@/lib/payments/provider.factory";
import { recordFullRefund } from "@/lib/ledger";
import { sendDisputeUpdateEmail } from "@/lib/notifications/email";
import { sendPushForDisputeUpdate } from "@/lib/notifications/push";
import { writeAuditLog as auditAdmin } from "@/lib/audit";
import { notifyEventWaitlistIfFirstActiveListing } from "@/lib/waitlist";

type ActionResult<T = { success: true }> = T | { error: string };

async function requireAdminActor(): Promise<{ id: string }> {
  const user = await getAppUser();
  if (!user || !(await isAdmin())) throw new Error("אין הרשאה.");
  return user;
}

// ── Listing: approve / reject / request more info ─────────────

const reviewListingSchema = z.object({
  listingId: z.string().min(1),
  decision: z.enum(["APPROVE", "REJECT", "REQUEST_INFO"]),
  notes: z.string().max(500).optional(),
});

export async function reviewListingAction(
  input: z.infer<typeof reviewListingSchema>
): Promise<ActionResult<{ newStatus: string }>> {
  const admin = await requireAdminActor();
  const parsed = reviewListingSchema.safeParse(input);
  if (!parsed.success) return { error: "קלט לא תקין" };
  const { listingId, decision, notes } = parsed.data;

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { id: true, status: true, vendorId: true, eventId: true, event: { select: { nameHe: true } } },
  });
  if (!listing) return { error: "המודעה לא נמצאה." };

  const newStatus =
    decision === "APPROVE" ? "ACTIVE" : decision === "REJECT" ? "REJECTED" : "PENDING_REVIEW";

  await db.$transaction([
    db.listing.update({ where: { id: listingId }, data: { status: newStatus } }),
    db.listingRisk.update({
      where: { listingId },
      data: { decision, reviewedById: admin.id, reviewedAt: new Date(), reviewNotes: notes },
    }),
  ]);

  if (newStatus === "ACTIVE") {
    await notifyEventWaitlistIfFirstActiveListing(listing.eventId, listing.event.nameHe);
  }

  await auditAdmin(admin.id, `LISTING_${decision}`, "Listing", listingId, {
    previousStatus: listing.status,
    newStatus,
    notes,
  });

  revalidatePath("/admin/listings");
  return { newStatus };
}

// ── Dispute: resolve in favour of buyer or seller ─────────────

const resolveDisputeSchema = z.object({
  disputeId: z.string().min(1),
  resolution: z.enum(["REFUND_BUYER", "RELEASE_TO_SELLER", "PARTIAL_REFUND"]),
  notes: z.string().min(5).max(1000),
  refundAmountShekel: z.number().min(0).optional(),
});

export async function resolveDisputeAction(
  input: z.infer<typeof resolveDisputeSchema>
): Promise<ActionResult> {
  const admin = await requireAdminActor();
  const parsed = resolveDisputeSchema.safeParse(input);
  if (!parsed.success) return { error: "קלט לא תקין" };
  const { disputeId, resolution, notes, refundAmountShekel } = parsed.data;

  const dispute = await db.dispute.findUnique({
    where: { id: disputeId },
    include: {
      order: {
        include: {
          event: { select: { nameHe: true } },
          buyer: true,
          vendor: { include: { user: true } },
        },
      },
    },
  });

  if (!dispute) return { error: "סכסוך לא נמצא." };
  if (dispute.status !== "OPEN" && dispute.status !== "UNDER_REVIEW") {
    return { error: "הסכסוך כבר נסגר." };
  }

  const { order } = dispute;
  const refundAgorot =
    resolution === "REFUND_BUYER"
      ? order.totalAgorot
      : resolution === "PARTIAL_REFUND"
      ? Math.round((refundAmountShekel ?? 0) * 100)
      : 0;

  // The seller's actual net proceeds (order total minus both the buyer's
  // and seller's platform fees) were recorded on this order's ledger the
  // moment it was paid — the same number the AUTO payout cron pays out
  // once an order is old enough to trust. Releasing to the seller here
  // must pay that same figure, never order.totalAgorot (which is what the
  // *buyer* paid, fees included, and would overpay the seller by both
  // fees combined).
  //
  // A partial refund splits the loss proportionally: if X% of what the
  // buyer paid gets refunded, the seller keeps (100-X)% of their proceeds
  // rather than either the full amount (unfair to the buyer, who has a
  // legitimate complaint) or nothing at all (unfair to the seller, who
  // did sell most of what they promised).
  let sellerPayoutAgorot = 0;
  if (resolution === "RELEASE_TO_SELLER" || resolution === "PARTIAL_REFUND") {
    const proceeds = await db.ledgerEntry.findFirst({ where: { orderId: order.id, type: "SELLER_PROCEEDS" } });
    if (!proceeds) return { error: "לא נמצאה רשומת הכנסה למוכר עבור הזמנה זו — לא ניתן לשחרר תשלום." };

    sellerPayoutAgorot =
      resolution === "RELEASE_TO_SELLER"
        ? proceeds.amountAgorot
        : Math.max(0, Math.round(proceeds.amountAgorot * (1 - refundAgorot / order.totalAgorot)));
  }

  await db.$transaction(async (tx) => {
    await tx.dispute.update({
      where: { id: disputeId },
      data: {
        status: resolution === "RELEASE_TO_SELLER" ? "RESOLVED_SELLER" : "RESOLVED_BUYER",
        resolution: notes,
        resolvedAt: new Date(),
        resolvedById: admin.id,
      },
    });

    await tx.order.update({
      where: { id: order.id },
      data: {
        status:
          resolution === "RELEASE_TO_SELLER"
            ? "CONFIRMED"
            : refundAgorot >= order.totalAgorot
            ? "REFUNDED"
            : "PARTIALLY_REFUNDED",
      },
    });

    if (sellerPayoutAgorot > 0) {
      // A payout may already exist here: schedule-payouts creates one the
      // moment an order turns CONFIRMED, and openDisputeAction puts it
      // ON_HOLD (rather than deleting it) if the buyer disputes afterwards.
      // Take that one off hold (updating its amount, in case this is a
      // partial refund reducing what it was originally created for)
      // instead of creating a second payout for the same order — only
      // create a fresh one if the dispute was raised before the order
      // ever reached that point.
      const existingPayout = await tx.payout.findFirst({ where: { orderId: order.id } });
      if (existingPayout) {
        await tx.payout.update({
          where: { id: existingPayout.id },
          data: { status: "PENDING", amountAgorot: sellerPayoutAgorot, failureReason: null },
        });
        await tx.paymentEvent.create({
          data: {
            orderId: order.id,
            payoutId: existingPayout.id,
            type: "PAYOUT_RESUMED",
            provider: "internal",
            amountAgorot: sellerPayoutAgorot,
            reason: `dispute resolved (${disputeId})`,
          },
        });
      } else {
        const created = await tx.payout.create({
          data: { orderId: order.id, vendorId: order.vendorId, status: "PENDING", trigger: "MANUAL", amountAgorot: sellerPayoutAgorot },
        });
        await tx.paymentEvent.create({
          data: {
            orderId: order.id,
            payoutId: created.id,
            type: "PAYOUT_SCHEDULED",
            provider: "internal",
            amountAgorot: sellerPayoutAgorot,
            reason: `dispute resolved (${disputeId})`,
          },
        });
      }
    } else {
      // Full refund (whether via REFUND_BUYER or a PARTIAL_REFUND that
      // happens to cover the whole order) — any payout still sitting
      // PENDING/ON_HOLD for this order must never go out.
      const cancelledPayouts = await tx.payout.findMany({
        where: { orderId: order.id, status: { in: ["PENDING", "ON_HOLD"] } },
        select: { id: true, amountAgorot: true },
      });
      if (cancelledPayouts.length > 0) {
        await tx.payout.updateMany({
          where: { id: { in: cancelledPayouts.map((p) => p.id) } },
          data: { status: "FAILED", failureReason: `בוטל — הסכסוך הוכרע לטובת הקונה (${disputeId})` },
        });
        await tx.paymentEvent.createMany({
          data: cancelledPayouts.map((p) => ({
            orderId: order.id,
            payoutId: p.id,
            type: "PAYOUT_CANCELLED" as const,
            provider: "internal",
            amountAgorot: p.amountAgorot,
            reason: `dispute resolved for buyer (${disputeId})`,
          })),
        });
      }
    }
  });

  if (refundAgorot > 0 && order.providerIntentId) {
    const provider = getPaymentProvider();
    await provider.refund({
      providerIntentId: order.providerIntentId,
      amountAgorot: refundAgorot,
      reason: "DISPUTE",
      idempotencyKey: `dispute_refund_${disputeId}`,
    });
    await recordFullRefund(order.id, refundAgorot, `dispute_${disputeId}`);
    await db.paymentEvent.create({
      data: {
        orderId: order.id,
        type: "REFUND_COMPLETED",
        provider: provider.name,
        providerReference: order.providerIntentId,
        amountAgorot: refundAgorot,
        reason: `dispute_${disputeId}`,
      },
    });
  }

  await auditAdmin(admin.id, "DISPUTE_RESOLVED", "Dispute", disputeId, {
    resolution,
    refundAgorot,
    sellerPayoutAgorot,
    notes,
    previousDisputeStatus: dispute.status,
    previousOrderStatus: order.status,
  });

  // Neither side has a reason to keep checking /profile — tell them the
  // outcome directly. isFullRefund also covers a PARTIAL_REFUND resolution
  // where the admin happened to type in the full order amount.
  const isFullRefund = resolution === "REFUND_BUYER" || refundAgorot >= order.totalAgorot;
  const fmtIls = (agorot: number) => `₪${Math.round(agorot / 100)}`;
  const eventName = order.event.nameHe;

  const buyerMessage =
    resolution === "RELEASE_TO_SELLER"
      ? `הפנייה שפתחת על ${eventName} נבדקה, והוחלט לשחרר את התשלום למוכר/ת — לא בוצע החזר.`
      : isFullRefund
      ? `בוצע לך החזר מלא על ${eventName}.`
      : `בוצע לך החזר חלקי על ${eventName} בסך ${fmtIls(refundAgorot)}.`;

  const sellerMessage =
    resolution === "RELEASE_TO_SELLER"
      ? `הפנייה על ${eventName} נסגרה לטובתך — התשלום שלך (${fmtIls(sellerPayoutAgorot)}) יצא לתהליך.`
      : isFullRefund
      ? `הפנייה על ${eventName} נסגרה — בוצע החזר מלא לקונה, ולא יועבר תשלום אליך על ההזמנה הזו.`
      : `הפנייה על ${eventName} נסגרה — בוצע החזר חלקי לקונה, והתשלום שלך עודכן ל-${fmtIls(sellerPayoutAgorot)}.`;

  await Promise.all([
    sendDisputeUpdateEmail({
      toEmail: order.buyer.email,
      toName: order.buyer.fullName,
      subject: `עדכון על הפנייה שפתחת — ${eventName}`,
      headline: buyerMessage,
    }),
    sendPushForDisputeUpdate({ recipientUserId: order.buyer.id, title: "עדכון על פנייה", body: buyerMessage }),
    sendDisputeUpdateEmail({
      toEmail: order.vendor.user.email,
      toName: order.vendor.user.fullName,
      subject: `עדכון על מחלוקת — ${eventName}`,
      headline: sellerMessage,
    }),
    sendPushForDisputeUpdate({ recipientUserId: order.vendor.user.id, title: "עדכון על מחלוקת", body: sellerMessage }),
  ]);

  revalidatePath("/admin/disputes");
  revalidatePath("/admin/payouts");
  revalidatePath("/profile");
  return { success: true };
}

// ── Payout: approve and process ───────────────────────────────

const processPayoutSchema = z.object({
  payoutId: z.string().min(1),
  notes: z.string().max(300).optional(),
});

export async function processPayoutAction(
  input: z.infer<typeof processPayoutSchema>
): Promise<ActionResult> {
  const admin = await requireAdminActor();
  const parsed = processPayoutSchema.safeParse(input);
  if (!parsed.success) return { error: "קלט לא תקין" };
  const { payoutId, notes } = parsed.data;

  const payout = await db.payout.findUnique({
    where: { id: payoutId },
    include: { vendor: { select: { bankAccountRef: true, displayName: true } } },
  });

  if (!payout) return { error: "התשלום לא נמצא." };
  if (!["PENDING", "ON_HOLD"].includes(payout.status)) {
    return { error: `לא ניתן לעבד תשלום בסטטוס ${payout.status}.` };
  }
  if (!payout.vendor.bankAccountRef) {
    return { error: "למוכר אין חשבון בנק מחובר. לא ניתן לבצע העברה." };
  }

  await db.payout.update({
    where: { id: payoutId },
    data: { status: "PROCESSING", scheduledFor: new Date() },
  });

  await db.paymentEvent.create({
    data: {
      orderId: payout.orderId,
      payoutId,
      type: "PAYOUT_PROCESSING_STARTED",
      provider: getPaymentProvider().name,
      amountAgorot: payout.amountAgorot,
    },
  });

  await auditAdmin(admin.id, "PAYOUT_PROCESSED", "Payout", payoutId, {
    amountAgorot: payout.amountAgorot,
    vendorId: payout.vendorId,
    previousStatus: payout.status,
    notes,
  });

  revalidatePath("/admin/payouts");
  return { success: true };
}

// ── Payout: put on hold ───────────────────────────────────────

const holdPayoutSchema = z.object({
  payoutId: z.string().min(1),
  reason: z.string().min(5).max(300),
});

export async function holdPayoutAction(input: z.infer<typeof holdPayoutSchema>): Promise<ActionResult> {
  const admin = await requireAdminActor();
  const parsed = holdPayoutSchema.safeParse(input);
  if (!parsed.success) return { error: "קלט לא תקין" };
  const { payoutId, reason } = parsed.data;

  const payout = await db.payout.findUnique({
    where: { id: payoutId },
    select: { status: true, orderId: true, amountAgorot: true },
  });
  if (!payout) return { error: "התשלום לא נמצא." };

  await db.payout.update({
    where: { id: payoutId },
    data: { status: "ON_HOLD", failureReason: reason },
  });

  await db.paymentEvent.create({
    data: {
      orderId: payout.orderId,
      payoutId,
      type: "PAYOUT_HELD",
      provider: "internal",
      amountAgorot: payout.amountAgorot,
      reason,
    },
  });

  await auditAdmin(admin.id, "PAYOUT_HELD", "Payout", payoutId, { reason, previousStatus: payout.status });

  revalidatePath("/admin/payouts");
  return { success: true };
}

// ── Vendor: suspend / reinstate / verify ──────────────────────

const updateVendorStatusSchema = z.object({
  vendorId: z.string().min(1),
  action: z.enum(["SUSPEND", "REINSTATE", "VERIFY"]),
  reason: z.string().max(500).optional(),
});

export async function updateVendorStatusAction(
  input: z.infer<typeof updateVendorStatusSchema>
): Promise<ActionResult> {
  const admin = await requireAdminActor();
  const parsed = updateVendorStatusSchema.safeParse(input);
  if (!parsed.success) return { error: "קלט לא תקין" };
  const { vendorId, action, reason } = parsed.data;

  const vendor = await db.vendor.findUnique({
    where: { id: vendorId },
    select: { status: true, isVerified: true, verificationLevel: true },
  });
  if (!vendor) return { error: "המוכר לא נמצא." };

  const newStatus = action === "SUSPEND" ? "SUSPENDED" : "ACTIVE";

  await db.vendor.update({
    where: { id: vendorId },
    data: {
      status: newStatus,
      ...(action === "VERIFY" && { isVerified: true, verificationLevel: "FULL" }),
    },
  });

  if (action === "SUSPEND") {
    await db.listing.updateMany({
      where: { vendorId, status: "ACTIVE" },
      data: { status: "SUSPENDED" },
    });
  }

  await auditAdmin(admin.id, `VENDOR_${action}`, "Vendor", vendorId, {
    newStatus,
    reason,
    previousStatus: vendor.status,
    previousIsVerified: vendor.isVerified,
    previousVerificationLevel: vendor.verificationLevel,
  });

  revalidatePath("/admin/users");
  return { success: true };
}

// ── Platform config update ────────────────────────────────────

const updateConfigSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});

export async function updatePlatformConfigAction(
  input: z.infer<typeof updateConfigSchema>
): Promise<ActionResult> {
  const admin = await requireAdminActor();
  const parsed = updateConfigSchema.safeParse(input);
  if (!parsed.success) return { error: "קלט לא תקין" };
  const { key, value } = parsed.data;

  const existing = await db.platformConfig.findUnique({ where: { key }, select: { value: true } });

  // Only version an actual change — an admin re-saving the same value
  // shouldn't inflate this key's version sequence with a meaningless
  // no-op entry.
  if (existing?.value !== value) {
    await db.$transaction(async (tx) => {
      await tx.platformConfig.upsert({
        where: { key },
        create: { key, value, updatedById: admin.id },
        update: { value, updatedById: admin.id },
      });

      const lastVersion = await tx.platformConfigVersion.findFirst({
        where: { key },
        orderBy: { version: "desc" },
        select: { version: true },
      });

      await tx.platformConfigVersion.create({
        data: {
          key,
          version: (lastVersion?.version ?? 0) + 1,
          previousValue: existing?.value ?? null,
          newValue: value,
          changedById: admin.id,
        },
      });
    });
  }

  await auditAdmin(admin.id, "CONFIG_UPDATED", "PlatformConfig", key, {
    value,
    previousValue: existing?.value ?? null,
  });

  revalidatePath("/admin/config");
  return { success: true };
}
