"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAppUser } from "@/lib/auth/server";
import type { ListingStatus, RiskLevel } from "@prisma/client";

const createListingSchema = z.object({
  eventId: z.string().min(1),
  section: z.string().max(200).optional(),
  quantity: z.number().int().min(1).max(10),
  faceValueAgorot: z.number().int().min(1),
  priceAgorot: z.number().int().min(1),
  isSafePassExchange: z.boolean(),
  note: z.string().max(300).optional(),
});

type ActionResult<T = { listingId: string }> = T | { error: string };

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
 * / risk_reject). No stolen-ticket detection is possible without uploaded
 * ticket files, so duplicateBarcode / duplicatePdfHash stay false —
 * everything else is computed from real data: this vendor's history and
 * dispute record, how many other listings they already have for this same
 * event, this listing's quantity and price. Markup itself is no longer
 * scored here — see checkMarkupAllowed, which runs before this and blocks
 * outright instead of contributing points toward a "maybe fine" score.
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

  let riskLevel: RiskLevel = "LOW";
  let status: ListingStatus = "ACTIVE";
  let decision = "APPROVE";
  if (totalScore >= reject) {
    riskLevel = "BLOCKED";
    status = "REJECTED";
    decision = "REJECT";
  } else if (totalScore >= manualReview) {
    riskLevel = "HIGH";
    status = "PENDING_REVIEW";
    decision = "REQUEST_INFO";
  } else if (totalScore >= autoApprove) {
    riskLevel = "MEDIUM";
    status = "ACTIVE";
  }

  return {
    totalScore,
    riskLevel,
    status,
    decision,
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
      note: data.note || null,
      riskScore: risk.totalScore,
      riskLevel: risk.riskLevel,
      riskAssessment: {
        create: {
          decision: risk.decision,
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

  revalidatePath("/profile");
  revalidatePath(`/event/${data.eventId}`);

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

  await db.listing.update({
    where: { id: listing.id },
    data: {
      section: data.section || null,
      quantity: data.quantity,
      priceAgorot: data.priceAgorot,
      isSafePassExchange: data.isSafePassExchange,
      note: data.note || null,
      ...(risk && {
        status: risk.status,
        riskScore: risk.totalScore,
        riskLevel: risk.riskLevel,
      }),
    },
  });

  if (risk) {
    await db.listingRisk.update({
      where: { listingId: listing.id },
      data: {
        decision: risk.decision,
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

  revalidatePath("/profile");
  return { success: true };
}
