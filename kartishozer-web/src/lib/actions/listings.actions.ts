"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAppUser } from "@/lib/auth/server";
import { writeAuditLog } from "@/lib/audit";
import { RISK_ENGINE_VERSION } from "@/lib/riskEngineVersion";
import { notifyEventWaitlistIfFirstActiveListing } from "@/lib/waitlist";
import type { ListingStatus, RiskLevel, RiskAssessmentTrigger } from "@prisma/client";

const createListingSchema = z.object({
  eventId: z.string().min(1),
  section: z.string().max(200).optional(),
  quantity: z.number().int().min(1).max(10),
  faceValueAgorot: z.number().int().min(1),
  priceAgorot: z.number().int().min(1),
  isSafePassExchange: z.boolean(),
  offersOfficialTransfer: z.boolean(),
  note: z.string().max(300).optional(),
});

type ActionResult<T = { listingId: string }> = T | { error: string };

/**
 * The free (no external KYC provider) half of graduated seller
 * verification: a vendor already earning the risk engine's
 * trustedSellerCredit (see assessListingRisk) — a real track record of
 * completed sales with zero disputes — is promoted from BASIC to FULL
 * automatically, the same badge an admin's manual VERIFY action grants.
 * One-directional on purpose: nothing here ever demotes a vendor back
 * down; a dispute against a FULL seller is a matter for admin review
 * (/admin/users), not an automatic downgrade.
 */
async function promoteVendorIfTrusted(vendorId: string, currentLevel: string, trustedSellerCredit: boolean) {
  if (!trustedSellerCredit || currentLevel === "FULL") return;
  await db.vendor.update({
    where: { id: vendorId },
    data: { verificationLevel: "FULL", isVerified: true },
  });
}

/** The score → outcome mapping assessListingRisk below resolves to. */
function decideRiskOutcome(
  totalScore: number,
  thresholds: { autoApprove: number; manualReview: number; reject: number }
): { riskLevel: RiskLevel; status: ListingStatus; decision: string } {
  if (totalScore >= thresholds.reject) {
    return { riskLevel: "BLOCKED", status: "REJECTED", decision: "REJECT" };
  }
  if (totalScore >= thresholds.manualReview) {
    return { riskLevel: "HIGH", status: "PENDING_REVIEW", decision: "REQUEST_INFO" };
  }
  if (totalScore >= thresholds.autoApprove) {
    return { riskLevel: "MEDIUM", status: "ACTIVE", decision: "APPROVE" };
  }
  return { riskLevel: "LOW", status: "ACTIVE", decision: "APPROVE" };
}

/**
 * Israeli consumer-protection law bars reselling a ticket for more than
 * its face value (platform/service fees are charged separately at
 * checkout and aren't part of this comparison) — selling at or below
 * face value is always allowed. This is a hard legal rule, not a risk
 * signal to be scored and weighed against other factors, so it's
 * enforced as its own gate that runs *before* a listing can be created
 * or have its price edited — not folded into assessListingRisk below,
 * which only ever sees prices that already passed this check.
 * max_markup_percent normally stays 0; it exists as a platform-config
 * escape hatch rather than a hardcoded 0 in case a future, narrower
 * legal allowance ever needs it.
 */
async function checkMarkupAllowed(priceAgorot: number, faceValueAgorot: number): Promise<string | null> {
  const config = await db.platformConfig.findUnique({ where: { key: "max_markup_percent" } });
  const maxMarkupPercent = Number(config?.value ?? 0);
  const maxAllowedPriceAgorot = Math.floor(faceValueAgorot * (1 + maxMarkupPercent / 100));

  if (priceAgorot <= maxAllowedPriceAgorot) return null;

  return maxMarkupPercent > 0
    ? `על פי חוק, אסור למכור כרטיס ביותר מ-${maxMarkupPercent}% מעל מחיר הפנים. אפשר למכור עד מחיר הפנים המקורי או בפחות ממנו.`
    : "על פי חוק, אסור למכור כרטיס ביותר ממחיר הפנים המקורי ששולם עבורו. אפשר למכור בדיוק במחיר הפנים או בפחות ממנו.";
}

/**
 * Real (not fake) risk engine — mirrors the thresholds the admin panel
 * already exposes in PlatformConfig (risk_auto_approve / risk_manual_review
 * / risk_reject). duplicateBarcode / duplicatePdfHash always start false
 * here — there's no ticket file yet at listing-creation time to check.
 * duplicatePdfHash only ever flips to true afterwards, from
 * ticketFiles.actions.ts, which forces PENDING_REVIEW/HIGH outright rather
 * than routing through this scoring ladder — an exact-duplicate ticket
 * file is decisive on its own, not a signal to weigh against others
 * (barcode-based detection isn't implemented at all yet). Everything else
 * here is computed from real data: this vendor's history
 * and dispute record, how many other listings they already have for this
 * same event, this listing's quantity and price. Markup itself is no
 * longer scored here — see checkMarkupAllowed, which runs before this and
 * blocks outright instead of contributing points toward a "maybe fine"
 * score.
 */
async function assessListingRisk(input: {
  vendorId: string;
  isVendorVerified: boolean;
  eventId: string;
  quantity: number;
  priceAgorot: number;
  faceValueAgorot: number;
  excludeListingId?: string;
}) {
  const config = await db.platformConfig.findMany({
    where: {
      key: {
        in: [
          "max_listings_per_vendor_per_day",
          "risk_auto_approve_threshold",
          "risk_manual_review_threshold",
          "risk_reject_threshold",
          "repeat_event_listing_threshold",
          "high_quantity_threshold",
          "high_value_ticket_threshold_agorot",
          "trusted_seller_min_orders",
        ],
      },
    },
  });
  const cfg = Object.fromEntries(config.map((c) => [c.key, Number(c.value)]));
  const maxPerDay = cfg.max_listings_per_vendor_per_day ?? 20;
  const autoApprove = cfg.risk_auto_approve_threshold ?? 20;
  const manualReview = cfg.risk_manual_review_threshold ?? 60;
  const reject = cfg.risk_reject_threshold ?? 80;
  const repeatEventThreshold = cfg.repeat_event_listing_threshold ?? 3;
  const highQuantityThreshold = cfg.high_quantity_threshold ?? 4;
  const highValueThresholdAgorot = cfg.high_value_ticket_threshold_agorot ?? 150000;
  const trustedSellerMinOrders = cfg.trusted_seller_min_orders ?? 10;

  // Always false: any listing reaching this point already passed
  // checkMarkupAllowed. Kept in the schema/admin audit trail rather than
  // removed — a `true` here after this change would mean the hard gate
  // was somehow bypassed, which is worth being able to see.
  const suspiciousFaceValue = false;

  const [priorApprovedCount, todayCount, sameEventCount, disputeCounts, completedOrderCount] = await Promise.all([
    db.listing.count({ where: { vendorId: input.vendorId, status: { in: ["ACTIVE", "SOLD"] } } }),
    db.listing.count({
      where: { vendorId: input.vendorId, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    db.listing.count({
      where: {
        vendorId: input.vendorId,
        eventId: input.eventId,
        deletedAt: null,
        status: { in: ["ACTIVE", "PENDING_REVIEW", "SOLD"] },
        ...(input.excludeListingId && { id: { not: input.excludeListingId } }),
      },
    }),
    Promise.all([
      db.dispute.count({ where: { order: { vendorId: input.vendorId }, status: "RESOLVED_BUYER" } }),
      db.dispute.count({ where: { order: { vendorId: input.vendorId } } }),
    ]),
    db.order.count({ where: { vendorId: input.vendorId, status: { in: ["CONFIRMED", "TICKET_DELIVERED"] } } }),
  ]);
  const [resolvedAgainstSellerCount, totalDisputeCount] = disputeCounts;

  const highRiskAccount = !input.isVendorVerified && priorApprovedCount === 0;
  const bulkListingFlag = todayCount >= maxPerDay;
  const repeatEventFlag = sameEventCount >= repeatEventThreshold;
  const highQuantityFlag = input.quantity >= highQuantityThreshold;
  const highValueTicketFlag = input.priceAgorot >= highValueThresholdAgorot;
  const pastDisputeFlag = resolvedAgainstSellerCount >= 1;
  const trustedSellerCredit = completedOrderCount >= trustedSellerMinOrders && totalDisputeCount === 0;

  let totalScore = 0;
  if (suspiciousFaceValue) totalScore += 35;
  if (highRiskAccount) totalScore += 25;
  if (bulkListingFlag) totalScore += 30;
  if (repeatEventFlag) totalScore += 20;
  if (highQuantityFlag) totalScore += 15;
  if (highValueTicketFlag) totalScore += 15;
  if (pastDisputeFlag) totalScore += 35;
  if (trustedSellerCredit) totalScore -= 25;
  totalScore = Math.max(0, totalScore);

  const { riskLevel, status, decision } = decideRiskOutcome(totalScore, {
    autoApprove,
    manualReview,
    reject,
  });

  return {
    totalScore,
    riskLevel,
    status,
    decision,
    riskEngineVersion: RISK_ENGINE_VERSION,
    duplicateBarcode: false,
    duplicatePdfHash: false,
    suspiciousFaceValue,
    highRiskAccount,
    bulkListingFlag,
    repeatEventFlag,
    highQuantityFlag,
    highValueTicketFlag,
    pastDisputeFlag,
    trustedSellerCredit,
  };
}

/**
 * Inserts one permanent history row per assessment — never updated, never
 * deleted. This is what actually fixes the P0 gap: ListingRisk itself
 * stays a single overwritten "current state" row (admin review UI,
 * existing call sites, and the risk badge on /admin/listings all still
 * read from it unchanged), but every score/flag combination that was ever
 * computed is now preserved here regardless of what overwrites that
 * current-state row afterwards.
 */
async function recordRiskAssessmentEvent(
  listingId: string,
  vendorId: string,
  trigger: RiskAssessmentTrigger,
  risk: Awaited<ReturnType<typeof assessListingRisk>>
) {
  await db.riskAssessmentEvent.create({
    data: {
      listingId,
      vendorId,
      trigger,
      riskEngineVersion: risk.riskEngineVersion,
      totalScore: risk.totalScore,
      riskLevel: risk.riskLevel,
      decision: risk.decision,
      duplicateBarcode: risk.duplicateBarcode,
      duplicatePdfHash: risk.duplicatePdfHash,
      suspiciousFaceValue: risk.suspiciousFaceValue,
      highRiskAccount: risk.highRiskAccount,
      bulkListingFlag: risk.bulkListingFlag,
      repeatEventFlag: risk.repeatEventFlag,
      highQuantityFlag: risk.highQuantityFlag,
      highValueTicketFlag: risk.highValueTicketFlag,
      pastDisputeFlag: risk.pastDisputeFlag,
      trustedSellerCredit: risk.trustedSellerCredit,
    },
  });
}

export async function createListingAction(
  input: z.infer<typeof createListingSchema>
): Promise<ActionResult> {
  const user = await getAppUser();
  if (!user) return { error: "יש להתחבר כדי לפרסם כרטיס" };

  const parsed = createListingSchema.safeParse(input);
  if (!parsed.success) return { error: "פרטי הכרטיס לא תקינים" };
  const data = parsed.data;

  if (data.priceAgorot < data.faceValueAgorot * 0.3) {
    // sanity guard against accidental typos (e.g. an extra missing digit)
    return { error: "המחיר נמוך מדי ביחס למחיר הפנים — בדקו שהזנתם נכון" };
  }

  const markupError = await checkMarkupAllowed(data.priceAgorot, data.faceValueAgorot);
  if (markupError) return { error: markupError };

  const event = await db.event.findUnique({ where: { id: data.eventId } });
  if (!event) return { error: "האירוע שנבחר לא נמצא" };

  const vendor = await db.vendor.upsert({
    where: { userId: user.id },
    create: { userId: user.id, displayName: user.fullName },
    update: {},
  });

  if (vendor.status === "SUSPENDED") {
    return { error: "חשבון המוכר שלכם מושעה כרגע ולא ניתן לפרסם כרטיסים חדשים" };
  }

  const risk = await assessListingRisk({
    vendorId: vendor.id,
    isVendorVerified: vendor.isVerified,
    eventId: data.eventId,
    quantity: data.quantity,
    priceAgorot: data.priceAgorot,
    faceValueAgorot: data.faceValueAgorot,
  });
  await promoteVendorIfTrusted(vendor.id, vendor.verificationLevel, risk.trustedSellerCredit);

  const listing = await db.listing.create({
    data: {
      eventId: data.eventId,
      vendorId: vendor.id,
      status: risk.status,
      section: data.section || null,
      quantity: data.quantity,
      priceAgorot: data.priceAgorot,
      faceValueAgorot: data.faceValueAgorot,
      isSafePassExchange: data.isSafePassExchange,
      offersOfficialTransfer: data.offersOfficialTransfer,
      note: data.note || null,
      riskScore: risk.totalScore,
      riskLevel: risk.riskLevel,
      riskAssessment: {
        create: {
          decision: risk.decision,
          riskEngineVersion: risk.riskEngineVersion,
          totalScore: risk.totalScore,
          duplicateBarcode: risk.duplicateBarcode,
          duplicatePdfHash: risk.duplicatePdfHash,
          suspiciousFaceValue: risk.suspiciousFaceValue,
          highRiskAccount: risk.highRiskAccount,
          bulkListingFlag: risk.bulkListingFlag,
          repeatEventFlag: risk.repeatEventFlag,
          highQuantityFlag: risk.highQuantityFlag,
          highValueTicketFlag: risk.highValueTicketFlag,
          pastDisputeFlag: risk.pastDisputeFlag,
          trustedSellerCredit: risk.trustedSellerCredit,
        },
      },
    },
  });

  await recordRiskAssessmentEvent(listing.id, vendor.id, "LISTING_CREATED", risk);

  if (risk.status === "ACTIVE") {
    await notifyEventWaitlistIfFirstActiveListing(data.eventId, event.nameHe);
  }

  revalidatePath("/profile");
  revalidatePath(`/event/${data.eventId}`);

  return { listingId: listing.id };
}

// A completed order is "yours to resell" during the exact same window
// it's yours to dispute about (see DISPUTABLE_ORDER_STATUSES in
// disputes.actions.ts) — PAID onward, not before (nothing to resell yet)
// and not once it's DISPUTED/REFUNDED/PARTIALLY_REFUNDED/CANCELLED
// (already says the transaction didn't hold).
const RESELLABLE_ORDER_STATUSES = ["PAID", "CONFIRMED", "TICKET_DELIVERED"] as const;

/**
 * One-click resell: a buyer who already paid for a ticket and can't use it
 * relists the exact same event/quantity/price/face-value as a brand-new
 * Listing under their own vendor account — no separate form, since
 * Order.priceAgorot/faceValueAgorot are the same "total for this many
 * tickets" snapshot a fresh listing needs (see Order.faceValueAgorot's own
 * doc comment). Reselling at cost is always legally allowed on its own
 * (guaranteed <= the true face value, since the original purchase already
 * passed this same check), but checkMarkupAllowed/assessListingRisk still
 * run exactly as they would for any other new listing — a resold ticket
 * gets no special trust, and if it happens to be an exact-file or QR
 * duplicate of a ticket already listed elsewhere, the existing
 * duplicate-detection in ticketFiles.actions.ts still catches it the
 * moment a ticket file is uploaded to this new listing.
 */
export async function resellOrderAction(orderId: string): Promise<ActionResult> {
  const user = await getAppUser();
  if (!user) return { error: "יש להתחבר" };

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      event: true,
      disputes: { where: { status: { in: ["OPEN", "UNDER_REVIEW"] } }, select: { id: true } },
    },
  });
  if (!order || order.buyerId !== user.id) return { error: "ההזמנה לא נמצאה" };
  if (order.resoldAsListingId) return { error: "ההזמנה הזו כבר פורסמה מחדש למכירה" };
  if (order.disputes.length > 0) return { error: "לא ניתן לפרסם מחדש הזמנה עם מחלוקת פתוחה" };
  if (!RESELLABLE_ORDER_STATUSES.includes(order.status as (typeof RESELLABLE_ORDER_STATUSES)[number])) {
    return { error: "לא ניתן לפרסם מחדש הזמנה זו" };
  }
  if (order.event.startsAt.getTime() < Date.now()) {
    return { error: "לא ניתן לפרסם מחדש כרטיס לאירוע שכבר עבר" };
  }

  const vendor = await db.vendor.upsert({
    where: { userId: user.id },
    create: { userId: user.id, displayName: user.fullName },
    update: {},
  });
  if (vendor.status === "SUSPENDED") {
    return { error: "חשבון המוכר שלכם מושעה כרגע ולא ניתן לפרסם כרטיסים חדשים" };
  }

  const markupError = await checkMarkupAllowed(order.priceAgorot, order.faceValueAgorot);
  if (markupError) return { error: markupError };

  const risk = await assessListingRisk({
    vendorId: vendor.id,
    isVendorVerified: vendor.isVerified,
    eventId: order.eventId,
    quantity: order.quantity,
    priceAgorot: order.priceAgorot,
    faceValueAgorot: order.faceValueAgorot,
  });
  await promoteVendorIfTrusted(vendor.id, vendor.verificationLevel, risk.trustedSellerCredit);

  const listing = await db.$transaction(async (tx) => {
    const created = await tx.listing.create({
      data: {
        eventId: order.eventId,
        vendorId: vendor.id,
        status: risk.status,
        quantity: order.quantity,
        priceAgorot: order.priceAgorot,
        faceValueAgorot: order.faceValueAgorot,
        isSafePassExchange: true,
        offersOfficialTransfer: false,
        riskScore: risk.totalScore,
        riskLevel: risk.riskLevel,
        riskAssessment: {
          create: {
            decision: risk.decision,
            riskEngineVersion: risk.riskEngineVersion,
            totalScore: risk.totalScore,
            duplicateBarcode: risk.duplicateBarcode,
            duplicatePdfHash: risk.duplicatePdfHash,
            suspiciousFaceValue: risk.suspiciousFaceValue,
            highRiskAccount: risk.highRiskAccount,
            bulkListingFlag: risk.bulkListingFlag,
            repeatEventFlag: risk.repeatEventFlag,
            highQuantityFlag: risk.highQuantityFlag,
            highValueTicketFlag: risk.highValueTicketFlag,
            pastDisputeFlag: risk.pastDisputeFlag,
            trustedSellerCredit: risk.trustedSellerCredit,
          },
        },
      },
    });

    // Same guard spirit as the checkout race fix: only ever set once, by
    // whichever request gets here first — not that two concurrent resells
    // of the same order are a realistic race, but there's no reason not
    // to make this a CAS anyway.
    const claimed = await tx.order.updateMany({
      where: { id: order.id, resoldAsListingId: null },
      data: { resoldAsListingId: created.id },
    });
    if (claimed.count === 0) throw new Error("ALREADY_RESOLD");

    return created;
  }).catch((err) => {
    if (err instanceof Error && err.message === "ALREADY_RESOLD") return null;
    throw err;
  });

  if (!listing) return { error: "ההזמנה הזו כבר פורסמה מחדש למכירה" };

  await recordRiskAssessmentEvent(listing.id, vendor.id, "ORDER_RESOLD", risk);

  if (risk.status === "ACTIVE") {
    await notifyEventWaitlistIfFirstActiveListing(order.eventId, order.event.nameHe);
  }

  revalidatePath("/profile");
  revalidatePath(`/event/${order.eventId}`);

  return { listingId: listing.id };
}

const updateListingSchema = z.object({
  listingId: z.string().min(1),
  section: z.string().max(200).optional(),
  quantity: z.number().int().min(1).max(10),
  priceAgorot: z.number().int().min(1),
  isSafePassExchange: z.boolean(),
  note: z.string().max(300).optional(),
});

export async function updateListingAction(
  input: z.infer<typeof updateListingSchema>
): Promise<ActionResult<{ success: true }>> {
  const user = await getAppUser();
  if (!user?.vendor) return { error: "יש להתחבר כמוכר/ת" };

  const parsed = updateListingSchema.safeParse(input);
  if (!parsed.success) return { error: "פרטי הכרטיס לא תקינים" };
  const data = parsed.data;

  const listing = await db.listing.findUnique({ where: { id: data.listingId } });
  if (!listing || listing.vendorId !== user.vendor.id) return { error: "ליסטינג לא נמצא" };
  if (listing.status === "SOLD") return { error: "לא ניתן לערוך כרטיס שכבר נמכר" };

  const priceChanged = data.priceAgorot !== listing.priceAgorot;
  const quantityChanged = data.quantity !== listing.quantity;

  if (priceChanged) {
    const markupError = await checkMarkupAllowed(data.priceAgorot, listing.faceValueAgorot);
    if (markupError) return { error: markupError };
  }

  const risk = priceChanged || quantityChanged
    ? await assessListingRisk({
        vendorId: user.vendor.id,
        isVendorVerified: user.vendor.isVerified,
        eventId: listing.eventId,
        quantity: data.quantity,
        priceAgorot: data.priceAgorot,
        faceValueAgorot: listing.faceValueAgorot,
        excludeListingId: listing.id,
      })
    : null;

  if (risk) {
    await promoteVendorIfTrusted(user.vendor.id, user.vendor.verificationLevel, risk.trustedSellerCredit);
  }

  // P0 fix: seller-initiated edits previously overwrote price/quantity/
  // section/note with zero record of what they replaced. Every field that
  // actually changed is captured here — never the fields that didn't, so
  // an edit that only tweaks the note doesn't fill the log with unchanged
  // price/quantity noise.
  const newSection = data.section || null;
  const newNote = data.note || null;
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  if (priceChanged) changes.priceAgorot = { from: listing.priceAgorot, to: data.priceAgorot };
  if (quantityChanged) changes.quantity = { from: listing.quantity, to: data.quantity };
  if (newSection !== listing.section) changes.section = { from: listing.section, to: newSection };
  if (newNote !== listing.note) changes.note = { from: listing.note, to: newNote };
  if (data.isSafePassExchange !== listing.isSafePassExchange) {
    changes.isSafePassExchange = { from: listing.isSafePassExchange, to: data.isSafePassExchange };
  }

  await db.listing.update({
    where: { id: listing.id },
    data: {
      section: newSection,
      quantity: data.quantity,
      priceAgorot: data.priceAgorot,
      isSafePassExchange: data.isSafePassExchange,
      note: newNote,
      ...(risk && {
        status: risk.status,
        riskScore: risk.totalScore,
        riskLevel: risk.riskLevel,
      }),
    },
  });

  if (Object.keys(changes).length > 0) {
    await writeAuditLog(user.id, "LISTING_UPDATED", "Listing", listing.id, { changes });
  }

  if (risk) {
    await db.listingRisk.update({
      where: { listingId: listing.id },
      data: {
        decision: risk.decision,
        riskEngineVersion: risk.riskEngineVersion,
        totalScore: risk.totalScore,
        suspiciousFaceValue: risk.suspiciousFaceValue,
        highRiskAccount: risk.highRiskAccount,
        bulkListingFlag: risk.bulkListingFlag,
        repeatEventFlag: risk.repeatEventFlag,
        highQuantityFlag: risk.highQuantityFlag,
        highValueTicketFlag: risk.highValueTicketFlag,
        pastDisputeFlag: risk.pastDisputeFlag,
        trustedSellerCredit: risk.trustedSellerCredit,
      },
    });
    await recordRiskAssessmentEvent(listing.id, user.vendor.id, "PRICE_OR_QUANTITY_EDITED", risk);
  }

  revalidatePath("/profile");
  revalidatePath(`/listing/${listing.id}`);

  return { success: true };
}

export async function delistListingAction(listingId: string): Promise<ActionResult<{ success: true }>> {
  const user = await getAppUser();
  if (!user?.vendor) return { error: "יש להתחבר כמוכר/ת" };

  const listing = await db.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.vendorId !== user.vendor.id) return { error: "ליסטינג לא נמצא" };
  if (listing.status === "SOLD") return { error: "לא ניתן להסיר כרטיס שכבר נמכר" };

  await db.listing.update({ where: { id: listingId }, data: { deletedAt: new Date() } });

  await writeAuditLog(user.id, "LISTING_DELISTED", "Listing", listingId, { previousStatus: listing.status });

  revalidatePath("/profile");
  return { success: true };
}
