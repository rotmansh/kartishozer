"use server";

// ============================================================
// Admin — Server Actions
// All actions require ADMIN role (verified server-side).
// Every action writes to AuditLog.
// ============================================================

import { z }             from "zod";
import { revalidatePath } from "next/cache";
import { db }            from "@/lib/db";
import { authAction }    from "@/lib/safe-action";
import { requireAdmin }  from "@/lib/types/admin";
import { getPaymentProvider } from "@/lib/payments/provider.factory";
import { recordFullRefund }   from "@/lib/ledger";

// ── Internal guard ────────────────────────────────────────────

async function assertAdmin(userId: string) {
  // Re-verify role on every action — never rely solely on middleware
  const { default: clerkClient } = await import("@clerk/nextjs/server");
  const user = await (await clerkClient()).users.getUser(userId);
  const role = (user.publicMetadata as any)?.role;
  if (role !== "ADMIN") throw new Error("אין הרשאה.");
}

async function auditAdmin(
  adminId:      string,
  action:       string,
  resourceType: string,
  resourceId:   string,
  metadata:     Record<string, unknown> = {}
) {
  await db.auditLog.create({
    data: {
      action,
      resourceType,
      resourceId,
      userId:   adminId,
      metadata: metadata as any,
    },
  });
}

// ── Listing: approve / reject / request more info ─────────────

export const reviewListingAction = authAction
  .schema(z.object({
    listingId:  z.string().cuid(),
    decision:   z.enum(["APPROVE", "REJECT", "REQUEST_INFO"]),
    notes:      z.string().max(500).optional(),
  }))
  .action(async ({ parsedInput, ctx }) => {
    await assertAdmin(ctx.userId);

    const listing = await db.listing.findUnique({
      where:  { id: parsedInput.listingId },
      select: { id: true, status: true, vendorId: true },
    });
    if (!listing) throw new Error("ליסטינג לא נמצא.");

    const newStatus =
      parsedInput.decision === "APPROVE"       ? "ACTIVE"
      : parsedInput.decision === "REJECT"      ? "REJECTED"
      : "PENDING_REVIEW"; // REQUEST_INFO stays in review

    await db.$transaction([
      db.listing.update({
        where: { id: parsedInput.listingId },
        data:  { status: newStatus },
      }),
      db.listingRisk.update({
        where: { listingId: parsedInput.listingId },
        data:  {
          decision:      parsedInput.decision,
          reviewedById:  ctx.userId,
          reviewedAt:    new Date(),
          reviewNotes:   parsedInput.notes,
        },
      }),
    ]);

    await auditAdmin(ctx.userId, `LISTING_${parsedInput.decision}`, "Listing", parsedInput.listingId, {
      previousStatus: listing.status,
      newStatus,
      notes: parsedInput.notes,
    });

    // TODO: notify vendor via Inngest if rejected

    revalidatePath("/admin/listings");
    return { success: true, newStatus };
  });

// ── Dispute: resolve in favour of buyer or seller ─────────────

export const resolveDisputeAction = authAction
  .schema(z.object({
    disputeId:  z.string().cuid(),
    resolution: z.enum(["REFUND_BUYER", "RELEASE_TO_SELLER", "PARTIAL_REFUND"]),
    notes:      z.string().min(5).max(1000),
    refundAmountShekel: z.number().min(0).optional(),
  }))
  .action(async ({ parsedInput, ctx }) => {
    await assertAdmin(ctx.userId);

    const dispute = await db.dispute.findUnique({
      where:   { id: parsedInput.disputeId },
      include: {
        order: {
          select: {
            id:              true,
            totalAgorot:     true,
            status:          true,
            vendorId:        true,
            providerIntentId: true,
          },
        },
      },
    });

    if (!dispute)                       throw new Error("סכסוך לא נמצא.");
    if (dispute.status !== "OPEN" && dispute.status !== "UNDER_REVIEW")
      throw new Error("הסכסוך כבר נסגר.");

    const { order } = dispute;
    const refundAgorot =
      parsedInput.resolution === "REFUND_BUYER"
        ? order.totalAgorot
        : parsedInput.resolution === "PARTIAL_REFUND"
        ? Math.round((parsedInput.refundAmountShekel ?? 0) * 100)
        : 0;

    await db.$transaction(async (tx) => {
      // Update dispute
      await tx.dispute.update({
        where: { id: parsedInput.disputeId },
        data:  {
          status:      parsedInput.resolution === "RELEASE_TO_SELLER"
            ? "RESOLVED_SELLER"
            : "RESOLVED_BUYER",
          resolution:  parsedInput.notes,
          resolvedAt:  new Date(),
          resolvedById: ctx.userId,
        },
      });

      // Update order
      await tx.order.update({
        where: { id: order.id },
        data:  {
          status: parsedInput.resolution === "RELEASE_TO_SELLER"
            ? "CONFIRMED"
            : refundAgorot >= order.totalAgorot
            ? "REFUNDED"
            : "PARTIALLY_REFUNDED",
        },
      });

      // If releasing to seller — create payout job
      if (parsedInput.resolution === "RELEASE_TO_SELLER") {
        await tx.payoutJob.create({
          data: {
            orderId:  order.id,
            vendorId: order.vendorId,
            status:   "QUEUED",
            trigger:  "MANUAL",
          },
        });
      }
    });

    // Issue refund through payment provider if needed
    if (refundAgorot > 0 && order.providerIntentId) {
      const provider = getPaymentProvider();
      await provider.refund({
        providerIntentId: order.providerIntentId,
        amountAgorot:     refundAgorot,
        reason:           "DISPUTE",
        idempotencyKey:   `dispute_refund_${parsedInput.disputeId}`,
      });
      await recordFullRefund(order.id, refundAgorot, `dispute_${parsedInput.disputeId}`);
    }

    await auditAdmin(ctx.userId, "DISPUTE_RESOLVED", "Dispute", parsedInput.disputeId, {
      resolution: parsedInput.resolution,
      refundAgorot,
      notes: parsedInput.notes,
    });

    revalidatePath("/admin/disputes");
    return { success: true };
  });

// ── Payout: approve and process ───────────────────────────────

export const processPayoutAction = authAction
  .schema(z.object({
    payoutId: z.string().cuid(),
    notes:    z.string().max(300).optional(),
  }))
  .action(async ({ parsedInput, ctx }) => {
    await assertAdmin(ctx.userId);

    const payout = await db.payout.findUnique({
      where:   { id: parsedInput.payoutId },
      include: { vendor: { select: { bankAccountRef: true, displayName: true } } },
    });

    if (!payout) throw new Error("פייאוט לא נמצא.");
    if (!["PENDING", "ON_HOLD"].includes(payout.status))
      throw new Error(`לא ניתן לעבד פייאוט בסטטוס ${payout.status}.`);
    if (!payout.vendor.bankAccountRef)
      throw new Error("למוכר אין חשבון בנק מחובר. לא ניתן לבצע העברה.");

    await db.payout.update({
      where: { id: parsedInput.payoutId },
      data:  { status: "PROCESSING", scheduledFor: new Date() },
    });

    // TODO: trigger bank transfer via Inngest
    // await inngest.send({ name: "payout/process", data: { payoutId: payout.id } });

    await auditAdmin(ctx.userId, "PAYOUT_PROCESSED", "Payout", parsedInput.payoutId, {
      amountAgorot: payout.amountAgorot,
      vendorId:     payout.vendorId,
      notes:        parsedInput.notes,
    });

    revalidatePath("/admin/payouts");
    return { success: true };
  });

// ── Payout: put on hold ───────────────────────────────────────

export const holdPayoutAction = authAction
  .schema(z.object({
    payoutId: z.string().cuid(),
    reason:   z.string().min(5).max(300),
  }))
  .action(async ({ parsedInput, ctx }) => {
    await assertAdmin(ctx.userId);

    await db.payout.update({
      where: { id: parsedInput.payoutId },
      data:  { status: "ON_HOLD", failureReason: parsedInput.reason },
    });

    await auditAdmin(ctx.userId, "PAYOUT_HELD", "Payout", parsedInput.payoutId, {
      reason: parsedInput.reason,
    });

    revalidatePath("/admin/payouts");
    return { success: true };
  });

// ── Vendor: suspend / reinstate ───────────────────────────────

export const updateVendorStatusAction = authAction
  .schema(z.object({
    vendorId: z.string().cuid(),
    action:   z.enum(["SUSPEND", "REINSTATE", "VERIFY"]),
    reason:   z.string().max(500).optional(),
  }))
  .action(async ({ parsedInput, ctx }) => {
    await assertAdmin(ctx.userId);

    const newStatus =
      parsedInput.action === "SUSPEND"   ? "SUSPENDED"
      : parsedInput.action === "VERIFY"  ? "ACTIVE"
      : "ACTIVE";

    const updateData: any = { status: newStatus };
    if (parsedInput.action === "VERIFY") {
      updateData.isVerified        = true;
      updateData.verificationLevel = "FULL";
    }

    await db.vendor.update({
      where: { id: parsedInput.vendorId },
      data:  updateData,
    });

    // If suspending — pause all active listings
    if (parsedInput.action === "SUSPEND") {
      await db.listing.updateMany({
        where: { vendorId: parsedInput.vendorId, status: "ACTIVE" },
        data:  { status: "SUSPENDED" },
      });
    }

    await auditAdmin(ctx.userId, `VENDOR_${parsedInput.action}`, "Vendor", parsedInput.vendorId, {
      newStatus,
      reason: parsedInput.reason,
    });

    revalidatePath("/admin/users");
    return { success: true };
  });

// ── Platform config update ────────────────────────────────────

export const updatePlatformConfigAction = authAction
  .schema(z.object({
    key:   z.string().min(1),
    value: z.string().min(1),
  }))
  .action(async ({ parsedInput, ctx }) => {
    await assertAdmin(ctx.userId);

    await db.platformConfig.upsert({
      where:  { key: parsedInput.key },
      create: {
        key:         parsedInput.key,
        value:       parsedInput.value,
        updatedById: ctx.userId,
      },
      update: {
        value:       parsedInput.value,
        updatedById: ctx.userId,
      },
    });

    await auditAdmin(ctx.userId, "CONFIG_UPDATED", "PlatformConfig", parsedInput.key, {
      value: parsedInput.value,
    });

    revalidatePath("/admin/config");
    return { success: true };
  });
