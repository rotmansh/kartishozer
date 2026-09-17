// ============================================================
// Admin — query layer
// Wide access — every query must be called from admin-only routes.
// ============================================================

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type {
  PlatformStats,
  AdminListing,
  AdminDispute,
  AdminPayout,
  AdminVendor,
  PlatformConfigEntry,
} from "./types";

// ── Platform stats ────────────────────────────────────────────

export async function getPlatformStats(): Promise<PlatformStats> {
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 24 * 3600_000);
  const d7 = new Date(now.getTime() - 7 * 24 * 3600_000);

  const [
    listingCounts,
    orderAgg,
    feeAgg,
    disputes,
    avgResolution,
    payoutAgg,
    vendorCounts,
    riskCounts,
  ] = await Promise.all([
    db.listing.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { id: true },
    }),

    db.order.aggregate({
      where: { status: { in: ["PAID", "TICKET_DELIVERED", "CONFIRMED"] }, paidAt: { gte: d30 } },
      _sum: { totalAgorot: true },
      _count: { id: true },
    }),

    db.ledgerEntry.aggregate({
      where: {
        type: "PLATFORM_FEE_BUYER",
        creditAccount: "PLATFORM_REVENUE",
        createdAt: { gte: d30 },
      },
      _sum: { amountAgorot: true },
    }),

    db.dispute.count({ where: { status: "OPEN" } }),

    db.$queryRaw<{ avg_hours: number }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600) AS avg_hours
      FROM "Dispute"
      WHERE "resolvedAt" IS NOT NULL
      AND   "createdAt" >= ${d30}
    `,

    db.payout.aggregate({
      where: { status: { in: ["PENDING", "PROCESSING"] } },
      _sum: { amountAgorot: true },
      _count: { id: true },
    }),

    Promise.all([
      db.vendor.count(),
      db.vendor.count({ where: { createdAt: { gte: d7 } } }),
      db.vendor.count({ where: { status: "SUSPENDED" } }),
    ]),

    db.listing.groupBy({
      by: ["riskLevel"],
      where: { status: "ACTIVE", deletedAt: null },
      _count: { id: true },
    }),
  ]);

  const lMap = Object.fromEntries(listingCounts.map((r) => [r.status, r._count.id]));
  const rMap = Object.fromEntries(riskCounts.map((r) => [r.riskLevel, r._count.id]));

  return {
    activeListings: lMap["ACTIVE"] ?? 0,
    pendingReviewListings: lMap["PENDING_REVIEW"] ?? 0,
    rejectedListings: lMap["REJECTED"] ?? 0,
    totalOrders30d: orderAgg._count.id,
    gmv30dAgorot: orderAgg._sum.totalAgorot ?? 0,
    platformRevenue30dAgorot: feeAgg._sum.amountAgorot ?? 0,
    openDisputes: disputes,
    avgResolutionHours: avgResolution[0]?.avg_hours ?? null,
    pendingPayoutsAgorot: payoutAgg._sum.amountAgorot ?? 0,
    pendingPayoutsCount: payoutAgg._count.id,
    totalVendors: vendorCounts[0],
    newVendors7d: vendorCounts[1],
    suspendedVendors: vendorCounts[2],
    highRiskListings: rMap["HIGH"] ?? 0,
    blockedListings: rMap["BLOCKED"] ?? 0,
  };
}

// ── Listings (risk review queue) ──────────────────────────────

export async function getAdminListings(options: {
  status?: string;
  riskLevel?: string;
  page?: number;
  pageSize?: number;
  search?: string;
} = {}): Promise<{ items: AdminListing[]; total: number }> {
  const { status, riskLevel, page = 1, pageSize = 20, search } = options;

  const where: Prisma.ListingWhereInput = { deletedAt: null };
  if (status) where.status = status as Prisma.EnumListingStatusFilter["equals"];
  if (riskLevel) where.riskLevel = riskLevel as Prisma.EnumRiskLevelFilter["equals"];
  if (search) where.event = { nameHe: { contains: search, mode: "insensitive" } };

  const [rows, total] = await Promise.all([
    db.listing.findMany({
      where,
      orderBy: [{ riskScore: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        status: true,
        riskScore: true,
        riskLevel: true,
        priceAgorot: true,
        faceValueAgorot: true,
        isSafePassExchange: true,
        createdAt: true,
        event: { select: { nameHe: true, startsAt: true, venue: { select: { city: true } } } },
        vendor: { select: { id: true, displayName: true, isVerified: true } },
        riskAssessment: {
          select: {
            decision: true,
            totalScore: true,
            duplicateBarcode: true,
            duplicatePdfHash: true,
            suspiciousFaceValue: true,
            highRiskAccount: true,
            bulkListingFlag: true,
            reviewedById: true,
            reviewNotes: true,
          },
        },
      },
    }),
    db.listing.count({ where }),
  ]);

  return {
    items: rows.map((r) => ({
      ...r,
      event: { nameHe: r.event.nameHe, startsAt: r.event.startsAt, city: r.event.venue.city },
      markupPercent:
        r.faceValueAgorot > 0
          ? Math.round(((r.priceAgorot - r.faceValueAgorot) / r.faceValueAgorot) * 100)
          : 0,
    })),
    total,
  };
}

// ── Disputes ──────────────────────────────────────────────────

export async function getAdminDisputes(options: {
  status?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<{ items: AdminDispute[]; total: number }> {
  const { status, page = 1, pageSize = 20 } = options;
  const where: Prisma.DisputeWhereInput = status
    ? { status: status as Prisma.EnumDisputeStatusFilter["equals"] }
    : {};

  const [rows, total] = await Promise.all([
    db.dispute.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        order: {
          select: {
            id: true,
            totalAgorot: true,
            status: true,
            buyerName: true,
            buyerEmail: true,
            event: { select: { nameHe: true, startsAt: true } },
            vendor: { select: { id: true, displayName: true } },
          },
        },
        requestedBy: { select: { id: true, email: true } },
      },
    }),
    db.dispute.count({ where }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      type: r.type,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt,
      resolution: r.resolution,
      order: {
        id: r.order.id,
        totalAgorot: r.order.totalAgorot,
        status: r.order.status,
        buyerName: r.order.buyerName,
        buyerEmail: r.order.buyerEmail,
      },
      event: {
        nameHe: r.order.event.nameHe,
        startsAt: r.order.event.startsAt,
      },
      vendor: {
        id: r.order.vendor.id,
        displayName: r.order.vendor.displayName,
      },
      requestedBy: {
        id: r.requestedBy.id,
        email: r.requestedBy.email,
      },
    })),
    total,
  };
}

// ── Payouts ───────────────────────────────────────────────────

export async function getAdminPayouts(options: {
  status?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<{ items: AdminPayout[]; total: number }> {
  const { status, page = 1, pageSize = 20 } = options;
  const where: Prisma.PayoutWhereInput = status
    ? { status: status as Prisma.EnumPayoutStatusFilter["equals"] }
    : {};

  const [rows, total] = await Promise.all([
    db.payout.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        vendor: { select: { id: true, displayName: true, bankAccountRef: true } },
        order: {
          select: {
            id: true,
            totalAgorot: true,
            event: { select: { nameHe: true } },
          },
        },
      },
    }),
    db.payout.count({ where }),
  ]);

  return { items: rows, total };
}

// ── Vendors ───────────────────────────────────────────────────

export async function getAdminVendors(options: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<{ items: AdminVendor[]; total: number }> {
  const { status, search, page = 1, pageSize = 20 } = options;

  const where: Prisma.VendorWhereInput = {};
  if (status) where.status = status as Prisma.EnumVendorStatusFilter["equals"];
  if (search) where.displayName = { contains: search, mode: "insensitive" };

  const [rows, total] = await Promise.all([
    db.vendor.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        displayName: true,
        isVerified: true,
        verificationLevel: true,
        status: true,
        createdAt: true,
        userId: true,
        _count: {
          select: {
            listings: { where: { deletedAt: null } },
            orders: true,
          },
        },
      },
    }),
    db.vendor.count({ where }),
  ]);

  const items = await Promise.all(
    rows.map(async (r) => {
      const [proceeds, disputeCount] = await Promise.all([
        db.ledgerEntry.aggregate({
          where: { type: "SELLER_PROCEEDS", creditAccount: "SELLER_PENDING", order: { vendorId: r.id } },
          _sum: { amountAgorot: true },
        }),
        db.dispute.count({ where: { order: { vendorId: r.id } } }),
      ]);
      return {
        id: r.id,
        displayName: r.displayName,
        isVerified: r.isVerified,
        verificationLevel: r.verificationLevel,
        status: r.status,
        createdAt: r.createdAt,
        userId: r.userId,
        listingCount: r._count.listings,
        orderCount: r._count.orders,
        totalEarnedAgorot: proceeds._sum.amountAgorot ?? 0,
        disputeCount,
      };
    })
  );

  return { items, total };
}

// ── Platform config ───────────────────────────────────────────

const CONFIG_META: Record<string, Omit<PlatformConfigEntry, "key" | "value" | "updatedAt" | "updatedById">> = {
  max_markup_percent: {
    label: "תקרת מחיר מעל פנים (%)",
    description:
      "אכיפה קשיחה, לא רק המלצה — מודעה שחורגת ממנה נחסמת בשרת ולא נוצרת בכלל. על פי חוק, ברירת המחדל היא 0 (אסור למכור מעל מחיר הפנים).",
    type: "number",
  },
  buyer_fee_percent: {
    label: "עמלת קונה (%)",
    description: "האחוז שנגבה מהקונה על כל עסקה. ברירת מחדל: 10",
    type: "number",
  },
  seller_fee_percent: {
    label: "עמלת מוכר (%)",
    description: "האחוז שנגבה מהמוכר על כל עסקה. ברירת מחדל: 7",
    type: "number",
  },
  payout_delay_days: {
    label: "ימי עיכוב לפני תשלום למוכר",
    description: "כמה ימים לאחר האירוע ישתחרר הכסף למוכר. ברירת מחדל: 3",
    type: "number",
  },
  max_listings_per_vendor_per_day: {
    label: "מקסימום מודעות למוכר ביום",
    description: "מגביל מוכרים מסחריים. ברירת מחדל: 20",
    type: "number",
  },
  risk_auto_approve_threshold: {
    label: "סף אישור אוטומטי (ציון סיכון)",
    description: "מודעות מתחת לסף זה יאושרו אוטומטית. ברירת מחדל: 20",
    type: "number",
  },
  risk_manual_review_threshold: {
    label: "סף בדיקה ידנית (ציון סיכון)",
    description: "מודעות מעל לסף זה יישלחו לבדיקה ידנית. ברירת מחדל: 60",
    type: "number",
  },
  risk_reject_threshold: {
    label: "סף דחייה (ציון סיכון)",
    description: "מודעות מעל לסף זה יידחו אוטומטית. ברירת מחדל: 80",
    type: "number",
  },
  maintenance_mode: {
    label: "מצב תחזוקה",
    description: "כשמופעל, האתר יציג הודעת תחזוקה לכל המשתמשים",
    type: "boolean",
  },
  new_vendor_registration_enabled: {
    label: "רישום מוכרים חדשים פתוח",
    description: "כשכבוי, מוכרים חדשים לא יוכלו להירשם",
    type: "boolean",
  },
};

export async function getPlatformConfig(): Promise<PlatformConfigEntry[]> {
  const rows = await db.platformConfig.findMany({ orderBy: { key: "asc" } });
  const rowMap = Object.fromEntries(rows.map((r) => [r.key, r]));

  return Object.entries(CONFIG_META).map(([key, meta]) => ({
    key: key as PlatformConfigEntry["key"],
    value: rowMap[key]?.value ?? getDefaultValue(key),
    label: meta.label,
    description: meta.description,
    type: meta.type,
    updatedAt: rowMap[key]?.updatedAt ?? new Date(0),
    updatedById: rowMap[key]?.updatedById ?? null,
  }));
}

function getDefaultValue(key: string): string {
  const defaults: Record<string, string> = {
    max_markup_percent: "0",
    buyer_fee_percent: "10",
    seller_fee_percent: "7",
    payout_delay_days: "3",
    max_listings_per_vendor_per_day: "20",
    risk_auto_approve_threshold: "20",
    risk_manual_review_threshold: "60",
    risk_reject_threshold: "80",
    maintenance_mode: "false",
    new_vendor_registration_enabled: "true",
  };
  return defaults[key] ?? "";
}

// ── Audit log ─────────────────────────────────────────────────

export async function getAuditLog(options: {
  resourceType?: string;
  resourceId?: string;
  action?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const { resourceType, resourceId, action, page = 1, pageSize = 50 } = options;

  const where: Prisma.AuditLogWhereInput = {};
  if (resourceType) where.resourceType = resourceType;
  if (resourceId) where.resourceId = resourceId;
  if (action) where.action = { contains: action, mode: "insensitive" };

  const [rows, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.auditLog.count({ where }),
  ]);

  return { items: rows, total, page, pageSize };
}
