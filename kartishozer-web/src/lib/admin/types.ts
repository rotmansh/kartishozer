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

// The rollups behind /admin/analytics — every number here is computed
// live from the P2/P3 data foundation (AnalyticsEvent, Visitor,
// OrderPricing) rather than a stored counter, and every "since" window
// only reflects activity from when that instrumentation shipped forward
// (see getMarketplaceAnalytics's own comment for exactly which fields
// that applies to).
export type MarketplaceAnalytics = {
  dau: number;
  wau: number;
  mau: number;
  newSignups7d: number;
  newListings7d: number;
  uniqueSellersAllTime: number;
  uniqueBuyersAllTime: number;
  sellThroughPercent: number | null;
  aov30dAgorot: number | null;
  repeatBuyers: number;
  repeatSellers: number;
  listingViewsToPurchasePercent: number | null;
  checkoutToPurchasePercent: number | null;
  disputeRate30dPercent: number | null;
  refundRate30dPercent: number | null;
  topAcquisitionSources: { source: string; signups: number }[];
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
    repeatEventFlag: boolean;
    highQuantityFlag: boolean;
    highValueTicketFlag: boolean;
    pastDisputeFlag: boolean;
    trustedSellerCredit: boolean;
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
  sellerResponse: string | null;
  sellerRespondedAt: Date | null;
  evidence: {
    id: string;
    uploaderRole: string;
    mimeType: string;
    createdAt: Date;
    note: string | null;
  }[];
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

export type AdminRoleUser = {
  clerkId: string;
  email: string;
  fullName: string;
};

export type PlatformConfigKey =
  | "max_markup_percent"
  | "buyer_fee_percent"
  | "seller_fee_percent"
  | "payout_delay_days"
  | "dispute_window_days"
  | "max_listings_per_vendor_per_day"
  | "risk_auto_approve_threshold"
  | "risk_manual_review_threshold"
  | "risk_reject_threshold"
  | "repeat_event_listing_threshold"
  | "high_quantity_threshold"
  | "high_value_ticket_threshold_agorot"
  | "trusted_seller_min_orders"
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
