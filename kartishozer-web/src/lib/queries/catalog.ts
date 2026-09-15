import "server-only";

import { db } from "@/lib/db";
import type { EventItem, Listing, Seller, CategorySlug } from "@/lib/types";
import type { Event, Venue, Listing as DbListing, Vendor, User } from "@prisma/client";

// ============================================================
// Real-data query layer. Every function returns the exact same
// shapes the Phase 1 UI components already consume (EventItem,
// Listing, Seller from @/lib/types) — only the source changed,
// from src/lib/mock/* arrays to Prisma queries against Postgres.
// ============================================================

function toEventItem(event: Event & { venue: Venue }): EventItem {
  return {
    id: event.id,
    nameHe: event.nameHe,
    category: event.category as CategorySlug,
    venue: { id: event.venue.id, nameHe: event.venue.nameHe, city: event.venue.city },
    startsAt: event.startsAt.toISOString(),
    isOpenDate: event.isOpenDate,
    descriptionHe: event.descriptionHe,
    gradient: [event.gradientFrom, event.gradientTo],
    emoji: event.emoji,
  };
}

async function salesCountFor(vendorId: string): Promise<number> {
  return db.order.count({
    where: { vendorId, status: { in: ["PAID", "CONFIRMED", "TICKET_DELIVERED"] } },
  });
}

async function toSeller(vendor: Vendor & { user: User }): Promise<Seller> {
  return {
    id: vendor.id,
    displayName: vendor.displayName,
    isVerified: vendor.isVerified,
    verificationLevel: vendor.verificationLevel,
    salesCount: await salesCountFor(vendor.id),
    memberSince: vendor.createdAt.toISOString(),
  };
}

async function toListing(listing: DbListing & { vendor: Vendor & { user: User } }): Promise<Listing> {
  return {
    id: listing.id,
    eventId: listing.eventId,
    seller: await toSeller(listing.vendor),
    status: listing.status === "PENDING_REVIEW" ? "PENDING_REVIEW" : listing.status === "SOLD" ? "SOLD" : "ACTIVE",
    section: listing.section ?? undefined,
    quantity: listing.quantity,
    priceAgorot: listing.priceAgorot,
    faceValueAgorot: listing.faceValueAgorot,
    isSafePassExchange: listing.isSafePassExchange,
    note: listing.note ?? undefined,
    createdAt: listing.createdAt.toISOString(),
  };
}

const listingInclude = { vendor: { include: { user: true } } } as const;

export async function getEvent(id: string): Promise<EventItem | null> {
  const event = await db.event.findUnique({ where: { id }, include: { venue: true } });
  return event ? toEventItem(event) : null;
}

// Every event a buyer can actually browse to must have something to buy —
// otherwise a listing that gets sold or delisted leaves its event behind
// as a ghost card (no price, no ticket count, nothing to do there). This
// is the shared condition every public browse query filters on; it's
// deliberately NOT used by the sell flow's own event search/dedup checks
// (searchEventsForSellAction, findSimilarEventsAction), which need to
// find an event specifically when it has no listings yet.
export const hasActiveListing = { listings: { some: { status: "ACTIVE" as const, deletedAt: null } } };

export async function getEventsByCategory(slug: string): Promise<EventItem[]> {
  const events = await db.event.findMany({
    where: { category: slug as CategorySlug, startsAt: { gte: new Date() }, ...hasActiveListing },
    include: { venue: true },
    orderBy: { startsAt: "asc" },
  });
  return events.map(toEventItem);
}

export async function getFeaturedEvents(): Promise<EventItem[]> {
  const events = await db.event.findMany({
    where: { startsAt: { gte: new Date() }, ...hasActiveListing },
    include: { venue: true },
    orderBy: { startsAt: "asc" },
    take: 5,
  });
  return events.map(toEventItem);
}

export async function getUpcomingEvents(): Promise<EventItem[]> {
  const events = await db.event.findMany({
    where: { startsAt: { gte: new Date() } },
    include: { venue: true },
    orderBy: { startsAt: "asc" },
  });
  return events.map(toEventItem);
}

export async function searchEvents(query: string): Promise<EventItem[]> {
  const q = query.trim();
  const events = await db.event.findMany({
    where: q
      ? {
          OR: [
            { nameHe: { contains: q, mode: "insensitive" } },
            { venue: { nameHe: { contains: q, mode: "insensitive" } } },
            { venue: { city: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {},
    include: { venue: true },
    orderBy: { startsAt: "asc" },
  });
  return events.map(toEventItem);
}

export async function getListing(id: string): Promise<Listing | null> {
  const listing = await db.listing.findFirst({
    where: { id, deletedAt: null },
    include: listingInclude,
  });
  return listing ? toListing(listing) : null;
}

export async function getListingsByEvent(eventId: string): Promise<Listing[]> {
  const listings = await db.listing.findMany({
    where: { eventId, status: "ACTIVE", deletedAt: null },
    include: listingInclude,
    orderBy: { priceAgorot: "asc" },
  });
  return Promise.all(listings.map(toListing));
}

export async function getNewestListings(limit = 8): Promise<Listing[]> {
  const listings = await db.listing.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    include: listingInclude,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return Promise.all(listings.map(toListing));
}

export async function getMinPriceAgorot(eventId: string): Promise<number | null> {
  const agg = await db.listing.aggregate({
    where: { eventId, status: "ACTIVE", deletedAt: null },
    _min: { priceAgorot: true },
  });
  return agg._min.priceAgorot;
}

export async function getListingCount(eventId: string): Promise<number> {
  return db.listing.count({ where: { eventId, status: "ACTIVE", deletedAt: null } });
}

/**
 * When an event has exactly one active listing, the event page (built to
 * let buyers compare multiple sellers) is a pointless extra tap between
 * the event card and the one listing it would show anyway — so callers
 * use this to link straight to that listing instead. Returns null both
 * when there are zero listings and when there's more than one, since
 * either way the event page is where the visitor actually needs to land.
 */
export async function getSoleActiveListingId(eventId: string): Promise<string | null> {
  const listings = await db.listing.findMany({
    where: { eventId, status: "ACTIVE", deletedAt: null },
    select: { id: true },
    take: 2,
  });
  return listings.length === 1 ? listings[0].id : null;
}

export async function getPlatformFees(): Promise<{ buyerFeePercent: number; sellerFeePercent: number }> {
  const rows = await db.platformConfig.findMany({
    where: { key: { in: ["buyer_fee_percent", "seller_fee_percent"] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, Number(r.value)]));
  return {
    buyerFeePercent: map.buyer_fee_percent ?? 10,
    sellerFeePercent: map.seller_fee_percent ?? 7,
  };
}

export function computeOrderMarkupPercent(priceAgorot: number, faceValueAgorot: number): number {
  if (faceValueAgorot <= 0) return 0;
  return Math.round(((priceAgorot - faceValueAgorot) / faceValueAgorot) * 100);
}

export async function computeOrderTotals(priceAgorot: number) {
  const fees = await getPlatformFees();
  const buyerFeeAgorot = Math.round((priceAgorot * fees.buyerFeePercent) / 100);
  return {
    priceAgorot,
    buyerFeeAgorot,
    totalAgorot: priceAgorot + buyerFeeAgorot,
  };
}
