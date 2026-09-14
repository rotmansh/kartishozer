// ============================================================
// Admin panel — types (ported from the standalone admin-panel
// prototype, adapted to the real Prisma schema in this app).
// ============================================================

export type PlatformStats = {
  activeListings: number;
  pendingReviewListings: number;
  rejectedListings: number;

  totalOrders30d: number;
  gmv30dAgorot: number;
  platformRevenue30dAgorot: number;

  openDisputes: number;
  avgResolutionHours: number | null;

  pendingPayoutsAgorot: number;
  pendingPayoutsCount: number;

  totalVendors: number;
  newVendors7d: number;
  suspendedVendors: number;

  highRiskListings: number;
  blockedListings: number;
};

export type AdminListing = {
  id: string;
  status: string;
  riskScore: number;
  riskLevel: string;
  priceAgorot: number;
  faceValueAgorot: number;
  markupPercent: number;
  isSafePassExchange: boolean;
  createdAt: Date;
  event: {
    nameHe: string;
    startsAt: Date;
    city: string;
  };
  vendor: {
    id: string;
    displayName: string;
    isVerified: boolean;
  };
  riskAssessment: {
    decision: string | null;
    totalScore: number;
    duplicateBarcode: boolean;
    duplicatePdfHash: boolean;
    suspiciousFaceValue: boolean;
    highRiskAccount: boolean;
    bulkListingFlag: boolean;
    reviewedById: string | null;
    reviewNotes: string | null;
  } | null;
};

export type AdminDispute = {
  id: string;
  type: string;
  reason: string;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
  resolution: string | null;
  order: {
    id: string;
    totalAgorot: number;
    status: string;
    buyerName: string;
    buyerEmail: string;
  };
  event: {
    nameHe: string;
    startsAt: Date;
  };
  vendor: {
    id: string;
    displayName: string;
  };
  requestedBy: {
    id: string;
    email: string;
  };
};

export type AdminPayout = {
  id: string;
  amountAgorot: number;
  status: string;
  trigger: string;
  scheduledFor: Date | null;
  processedAt: Date | null;
  createdAt: Date;
  vendor: {
    id: string;
    displayName: string;
    bankAccountRef: string | null;
  };
  order: {
    id: string;
    totalAgorot: number;
    event: { nameHe: string };
  };
};

export type AdminVendor = {
  id: string;
  displayName: string;
  isVerified: boolean;
  verificationLevel: string | null;
  status: string;
  createdAt: Date;
  listingCount: number;
  orderCount: number;
  totalEarnedAgorot: number;
  disputeCount: number;
  userId: string;
};

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
  key: PlatformConfigKey;
  value: string;
  label: string;
  description: string;
  type: "number" | "boolean" | "string";
  updatedAt: Date;
  updatedById: string | null;
};
