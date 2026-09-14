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
 * Very small, real (not fake) risk engine — mirrors the thresholds the
 * admin panel already exposes in PlatformConfig (risk_auto_approve /
 * risk_manual_review / risk_reject). No stolen-ticket detection is
 * possible without uploaded ticket files, so duplicateBarcode /
 * duplicatePdfHash stay false — everything else is computed from real
 * data (this vendor's history, this listing's price vs face value).
 */
async function assessListingRisk(input: {
  vendorId: string;
  isVendorVerified: boolean;
  priceAgorot: number;
  faceValueAgorot: number;
}) {
  const config = await db.platformConfig.findMany({
    where: {
      key: {
        in: [
          "max_markup_percent",
          "max_listings_per_vendor_per_day",
          "risk_auto_approve_threshold",
          "risk_manual_review_threshold",
          "risk_reject_threshold",
        ],
      },
    },
  });
  const cfg = Object.fromEntries(config.map((c) => [c.key, Number(c.value)]));
  const maxMarkup = cfg.max_markup_percent ?? 20;
  const maxPerDay = cfg.max_listings_per_vendor_per_day ?? 20;
  const autoApprove = cfg.risk_auto_approve_threshold ?? 20;
  const manualReview = cfg.risk_manual_review_threshold ?? 60;
  const reject = cfg.risk_reject_threshold ?? 80;

  const markup =
    input.faceValueAgorot > 0
      ? Math.round(((input.priceAgorot - input.faceValueAgorot) / input.faceValueAgorot) * 100)
      : 0;
  const suspiciousFaceValue = markup > maxMarkup;

  const [priorApprovedCount, todayCount] = await Promise.all([
    db.listing.count({ where: { vendorId: input.vendorId, status: { in: ["ACTIVE", "SOLD"] } } }),
    db.listing.count({
      where: { vendorId: input.vendorId, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
  ]);
  const highRiskAccount = !input.isVendorVerified && priorApprovedCount === 0;
  const bulkListingFlag = todayCount >= maxPerDay;

  let totalScore = 0;
  if (suspiciousFaceValue) totalScore += 35;
  if (highRiskAccount) totalScore += 25;
  if (bulkListingFlag) totalScore += 30;

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

  const risk = priceChanged
    ? await assessListingRisk({
        vendorId: user.vendor.id,
        isVendorVerified: user.vendor.isVerified,
        priceAgorot: data.priceAgorot,
        faceValueAgorot: listing.faceValueAgorot,
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
