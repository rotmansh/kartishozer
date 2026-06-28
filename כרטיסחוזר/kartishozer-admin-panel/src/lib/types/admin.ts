// ============================================================
// Admin Panel — types + role guard
// ============================================================

// ── Admin role check ──────────────────────────────────────────
// Clerk metadata: user.publicMetadata.role === "ADMIN"
// Never trust client-side — always verify server-side.

import { auth }   from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function requireAdmin() {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in?redirect=/admin");

  const role = (sessionClaims?.metadata as any)?.role;
  if (role !== "ADMIN") redirect("/");   // silent redirect — don't reveal admin exists

  return { userId };
}

// ── Platform stats ────────────────────────────────────────────

export type PlatformStats = {
  // Listings
  activeListings:       number;
  pendingReviewListings: number;
  rejectedListings:     number;

  // Orders (last 30 days)
  totalOrders30d:       number;
  gmv30dAgorot:         number;     // gross merchandise value
  platformRevenue30dAgorot: number;

  // Disputes
  openDisputes:         number;
  avgResolutionHours:   number | null;

  // Payouts
  pendingPayoutsAgorot: number;
  pendingPayoutsCount:  number;

  // Users
  totalVendors:         number;
  newVendors7d:         number;
  suspendedVendors:     number;

  // Risk
  highRiskListings:     number;
  blockedListings:      number;
};

// ── Admin listing view ────────────────────────────────────────

export type AdminListing = {
  id:              string;
  status:          string;
  riskScore:       number;
  riskLevel:       string;
  priceAgorot:     number;
  faceValueAgorot: number;
  markupPercent:   number;
  isSafePassExchange: boolean;
  createdAt:       Date;
  event: {
    nameHe:   string;
    startsAt: Date;
    city:     string;
  };
  vendor: {
    id:          string;
    displayName: string;
    isVerified:  boolean;
  };
  riskAssessment: {
    decision:            string;
    totalScore:          number;
    duplicateBarcode:    boolean;
    duplicatePdfHash:    boolean;
    suspiciousFaceValue: boolean;
    highRiskAccount:     boolean;
    bulkListingFlag:     boolean;
    reviewedById:        string | null;
    reviewNotes:         string | null;
  } | null;
};

// ── Admin dispute view ────────────────────────────────────────

export type AdminDispute = {
  id:          string;
  type:        string;
  reason:      string;
  status:      string;
  createdAt:   Date;
  resolvedAt:  Date | null;
  resolution:  string | null;
  order: {
    id:          string;
    totalAgorot: number;
    status:      string;
    buyerName:   string;
    buyerEmail:  string;
  };
  event: {
    nameHe:   string;
    startsAt: Date;
  };
  vendor: {
    id:          string;
    displayName: string;
  };
  requestedBy: {
    id:    string;
    email: string;
  };
};

// ── Admin payout view ─────────────────────────────────────────

export type AdminPayout = {
  id:           string;
  amountAgorot: number;
  status:       string;
  trigger:      string;
  scheduledFor: Date | null;
  processedAt:  Date | null;
  createdAt:    Date;
  vendor: {
    id:          string;
    displayName: string;
    bankAccountRef: string | null;
  };
  order: {
    id:          string;
    totalAgorot: number;
    event: { nameHe: string };
  };
};

// ── Admin user view ───────────────────────────────────────────

export type AdminVendor = {
  id:                string;
  displayName:       string;
  isVerified:        boolean;
  verificationLevel: string | null;
  status:            string;
  createdAt:         Date;
  listingCount:      number;
  orderCount:        number;
  totalEarnedAgorot: number;
  disputeCount:      number;
  userId:            string;
};

// ── Platform config ───────────────────────────────────────────

export type PlatformConfigKey =
  | "max_markup_percent"
  | "buyer_fee_percent"
  | "seller_fee_percent"
  | "payout_delay_days"
  | "max_listings_per_vendor_per_day"
  | "risk_auto_approve_threshold"
  | "risk_manual_review_threshold"
  | "risk_reject_threshold"
  | "maintenance_mode"
  | "new_vendor_registration_enabled";

export type PlatformConfigEntry = {
  key:         PlatformConfigKey;
  value:       string;
  label:       string;
  description: string;
  type:        "number" | "boolean" | "string";
  updatedAt:   Date;
  updatedById: string | null;
};
