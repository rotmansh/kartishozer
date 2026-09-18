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
  | "vouchers";

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
  startsAt: string; // ISO date — a fixed sentinel when isOpenDate is true
  isOpenDate: boolean; // no specific showtime (e.g. a theme park ticket)
  descriptionHe: string;
  gradient: [string, string];
  emoji: string;
  createdAt: string; // ISO date — the cover-art pool version an event is pinned to (see coverArt/rng.ts)
};

// Multiple sellers listing the same open-date attraction (isOpenDate:
// true) all get upserted with this exact startsAt, so they collide on
// Event's existing @@unique([nameHe, venueId, startsAt]) and land on one
// row instead of each getting their own — no separate uniqueness rule
// needed. Far enough out that startsAt >= now() filters always pass it.
export const OPEN_DATE_SENTINEL = "2099-01-01T00:00:00.000Z";

export type SellerVerificationLevel = "NONE" | "BASIC" | "FULL";

export type Seller = {
  id: string;
  displayName: string;
  isVerified: boolean;
  verificationLevel: SellerVerificationLevel;
  salesCount: number;
  memberSince: string; // ISO date
  ratingAverage: number | null; // null when the seller has zero reviews yet
  ratingCount: number;
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
  hasTicketFile: boolean; // seller uploaded the actual ticket to the digital vault
  offersOfficialTransfer: boolean; // seller-reported: will use the ticketing provider's own transfer feature
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

export type PriceIndex = {
  minPriceAgorot: number;
  maxPriceAgorot: number;
  medianMarkupPercent: number;
  atOrBelowFaceCount: number;
  totalCount: number;
};

// Aggregates the currently-active listings for one event into a single
// "is this a fair market" snapshot — shown once above the listing list
// instead of making a buyer compare N cards by eye. Deliberately computed
// from what's on-screen already (no extra query): every consumer of this
// already fetched the full active-listings array for the event.
export function computePriceIndex(listings: Pick<Listing, "priceAgorot" | "faceValueAgorot">[]): PriceIndex | null {
  if (listings.length < 2) return null;

  const prices = listings.map((l) => l.priceAgorot);
  const markups = listings.map((l) => markupPercent(l.priceAgorot, l.faceValueAgorot)).sort((a, b) => a - b);
  const mid = Math.floor(markups.length / 2);
  const medianMarkupPercent =
    markups.length % 2 === 0 ? Math.round((markups[mid - 1] + markups[mid]) / 2) : markups[mid];

  return {
    minPriceAgorot: Math.min(...prices),
    maxPriceAgorot: Math.max(...prices),
    medianMarkupPercent,
    atOrBelowFaceCount: markups.filter((m) => m <= 0).length,
    totalCount: listings.length,
  };
}
