// ============================================================
// Domain types — consumer app
// Money is always in agorot (1 ILS = 100 agorot), same convention
// as the admin panel, to keep future integration friction-free.
// ============================================================

export type CategorySlug =
  | "concerts"
  | "standup"
  | "theater"
  | "sports"
  | "attractions"
  | "kids";

export type Category = {
  slug: CategorySlug;
  labelHe: string;
  icon: string; // lucide-react icon name
  emoji: string;
  gradient: [string, string];
};

export type Venue = {
  id: string;
  nameHe: string;
  city: string;
};

export type EventItem = {
  id: string;
  nameHe: string;
  category: CategorySlug;
  venue: Venue;
  startsAt: string; // ISO date
  descriptionHe: string;
  gradient: [string, string];
  emoji: string;
};

export type SellerVerificationLevel = "NONE" | "BASIC" | "FULL";

export type Seller = {
  id: string;
  displayName: string;
  isVerified: boolean;
  verificationLevel: SellerVerificationLevel;
  salesCount: number;
  memberSince: string; // ISO date
};

export type ListingStatus = "ACTIVE" | "PENDING_REVIEW" | "SOLD";

export type Listing = {
  id: string;
  eventId: string;
  seller: Seller;
  status: ListingStatus;
  section?: string;
  quantity: number;
  priceAgorot: number;
  faceValueAgorot: number;
  isSafePassExchange: boolean; // digital transfer via platform, no physical handoff
  note?: string;
  createdAt: string; // ISO date
};

export type PlatformFees = {
  buyerFeePercent: number;
  sellerFeePercent: number;
};

export const DEFAULT_FEES: PlatformFees = {
  buyerFeePercent: 10,
  sellerFeePercent: 7,
};

export function markupPercent(priceAgorot: number, faceValueAgorot: number): number {
  if (faceValueAgorot <= 0) return 0;
  return Math.round(((priceAgorot - faceValueAgorot) / faceValueAgorot) * 100);
}
