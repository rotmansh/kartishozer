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
import type { Prisma } from "@prisma/client";
import { getAppUser, isAdmin } from "@/lib/auth/server";
import { getPaymentProvider } from "@/lib/payments/provider.factory";
import { recordFullRefund } from "@/lib/ledger";

type ActionResult<T = { success: true }> = T | { error: string };

async function requireAdminActor(): Promise<{ id: string }> {
  const user = await getAppUser();
  if (!user || !(await isAdmin())) throw new Error("אין הרשאה.");
  return user;
}

async function auditAdmin(
  adminId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  metadata: Record<string, unknown> = {}
) {
  await db.auditLog.create({
    data: { action, resourceType, resourceId, userId: adminId, metadata: metadata as Prisma.InputJsonValue },
  });
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
    select: { id: true, status: true, vendorId: true },
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
        select: { id: true, totalAgorot: true, status: true, vendorId: true, providerIntentId: true },
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

    if (resolution === "RELEASE_TO_SELLER") {
      await tx.payout.create({
        data: { orderId: order.id, vendorId: order.vendorId, status: "PENDING", trigger: "MANUAL", amountAgorot: order.totalAgorot },
      });
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
  }

  await auditAdmin(admin.id, "DISPUTE_RESOLVED", "Dispute", disputeId, { resolution, refundAgorot, notes });

  revalidatePath("/admin/disputes");
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

  await auditAdmin(admin.id, "PAYOUT_PROCESSED", "Payout", payoutId, {
    amountAgorot: payout.amountAgorot,
    vendorId: payout.vendorId,
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

  await db.payout.update({
    where: { id: payoutId },
    data: { status: "ON_HOLD", failureReason: reason },
  });

  await auditAdmin(admin.id, "PAYOUT_HELD", "Payout", payoutId, { reason });

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

  await auditAdmin(admin.id, `VENDOR_${action}`, "Vendor", vendorId, { newStatus, reason });

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

  await db.platformConfig.upsert({
    where: { key },
    create: { key, value, updatedById: admin.id },
    update: { value, updatedById: admin.id },
  });

  await auditAdmin(admin.id, "CONFIG_UPDATED", "PlatformConfig", key, { value });

  revalidatePath("/admin/config");
  return { success: true };
}
