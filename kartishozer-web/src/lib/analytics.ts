import "server-only";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { AnalyticsEventType, Prisma } from "@prisma/client";

export const VISITOR_COOKIE = "kh_vid";

export function getVisitorId(): string | null {
  return cookies().get(VISITOR_COOKIE)?.value ?? null;
}

/**
 * Called on every request from the root layout while a user is signed
 * in — cheap once linked (the where-clause then matches zero rows
 * forever after). This is the one place a pre-signup visitor's earlier
 * browsing gets attached to the account they eventually created,
 * regardless of whether that happened in the same browser-tab session
 * the attribution tracker already fired in (see AttributionTracker.tsx)
 * or a later one.
 */
export async function linkVisitorToUser(userId: string): Promise<void> {
  const vid = getVisitorId();
  if (!vid) return;
  await db.visitor
    .updateMany({ where: { id: vid, userId: null }, data: { userId } })
    .catch((err) => console.error("Failed to link visitor to user:", err));
}

// Some event types get a short server-side de-dupe window keyed on
// (type, listing/visitor-or-user) — this is what keeps a held-open tab
// with auto-refresh, or React re-rendering, from inflating "total views"
// or "checkout starts" into meaningless noise, without ever touching a
// mutable counter that could silently drift. Events with no window here
// (favorites, payment funnel) are each a genuine, deliberate user action
// worth recording every time it happens.
const DEDUPE_WINDOW_MS: Partial<Record<AnalyticsEventType, number>> = {
  SITE_VISIT: 5 * 60 * 1000,
  LISTING_VIEWED: 30 * 60 * 1000,
  CHECKOUT_STARTED: 30 * 60 * 1000,
  SELL_WIZARD_STARTED: 60 * 60 * 1000,
};

async function logEvent(input: {
  type: AnalyticsEventType;
  visitorId?: string | null;
  userId?: string | null;
  listingId?: string | null;
  eventId?: string | null;
  orderId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const window = DEDUPE_WINDOW_MS[input.type];
    if (window && (input.userId || input.visitorId)) {
      const recent = await db.analyticsEvent.findFirst({
        where: {
          type: input.type,
          listingId: input.listingId ?? undefined,
          createdAt: { gte: new Date(Date.now() - window) },
          ...(input.userId ? { userId: input.userId } : { visitorId: input.visitorId }),
        },
        select: { id: true },
      });
      if (recent) return;
    }

    await db.analyticsEvent.create({
      data: {
        type: input.type,
        visitorId: input.visitorId ?? null,
        userId: input.userId ?? null,
        listingId: input.listingId ?? null,
        eventId: input.eventId ?? null,
        orderId: input.orderId ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    // Analytics must never break the page/flow it's instrumenting.
    console.error(`Failed to log analytics event ${input.type}:`, err);
  }
}

export async function recordSiteVisit(visitorId: string, path: string, userId: string | null): Promise<void> {
  await logEvent({ type: "SITE_VISIT", visitorId, userId, metadata: { path } });
}

/**
 * The correct way to count distinct *people*, not distinct browsers —
 * one signed-in user can have several Visitor rows (phone, laptop, a
 * second browser), and each fires its own SITE_VISIT. A signed-in visit
 * always carries `userId` directly (see recordSiteVisit), so deduping by
 * `userId ?? visitorId` collapses every device of the same signed-in
 * user into one, while each still-anonymous visitor keeps counting
 * separately by their own visitorId. This is the one place DAU/WAU/MAU
 * (or any other "how many distinct users" question) should be computed
 * from — never a bare `COUNT(DISTINCT visitorId)`, which would double-
 * count a multi-device user.
 */
export async function getActiveIdentityCount(since: Date): Promise<number> {
  const rows = await db.analyticsEvent.findMany({
    where: { type: "SITE_VISIT", createdAt: { gte: since } },
    select: { userId: true, visitorId: true },
  });
  const keys = new Set(rows.map((r) => r.userId ?? r.visitorId));
  return keys.size;
}

/**
 * A listing's own seller viewing their own listing is excluded outright
 * (never even reaches the de-dupe check) — that traffic is real, but it
 * isn't customer demand and must never count toward "views" the way the
 * requirements insist on. Nothing is logged at all if neither a userId
 * nor a visitorId cookie is available (e.g. a first-ever pageview before
 * the attribution tracker has had a chance to set the cookie) — there's
 * nothing to key "unique" on in that case.
 */
export async function recordListingViewed(params: {
  listingId: string;
  viewerUserId: string | null;
  isOwnListing: boolean;
}): Promise<void> {
  if (params.isOwnListing) return;
  const visitorId = getVisitorId();
  if (!params.viewerUserId && !visitorId) return;
  await logEvent({
    type: "LISTING_VIEWED",
    listingId: params.listingId,
    userId: params.viewerUserId,
    visitorId,
  });
}

export async function recordCheckoutStarted(params: { listingId: string; userId: string }): Promise<void> {
  await logEvent({
    type: "CHECKOUT_STARTED",
    listingId: params.listingId,
    userId: params.userId,
    visitorId: getVisitorId(),
  });
}

export async function recordSellWizardStarted(params: { userId: string }): Promise<void> {
  await logEvent({ type: "SELL_WIZARD_STARTED", userId: params.userId, visitorId: getVisitorId() });
}

export async function recordFavoriteEvent(params: {
  added: boolean;
  userId: string;
  listingId?: string;
  eventId?: string;
}): Promise<void> {
  await logEvent({
    type: params.added ? "FAVORITE_ADDED" : "FAVORITE_REMOVED",
    listingId: params.listingId ?? null,
    eventId: params.eventId ?? null,
    userId: params.userId,
    visitorId: getVisitorId(),
  });
}

export async function recordPaymentFunnelEvent(params: {
  type: "PAYMENT_STARTED" | "PAYMENT_FAILED";
  listingId: string;
  userId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await logEvent({
    type: params.type,
    listingId: params.listingId,
    userId: params.userId,
    visitorId: getVisitorId(),
    metadata: params.metadata,
  });
}
