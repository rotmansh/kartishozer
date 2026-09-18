-- P2: business-event analytics foundation (views, favorites, checkout/
-- payment funnel, sell-wizard funnel) plus visitor attribution (UTM,
-- referrer, first/last touch) for a pre-signup funnel. Purely additive —
-- no existing table, column, or enum value is changed or removed.

-- The seller-side platform fee was always subtracted correctly when
-- computing SELLER_PROCEEDS, but never had its own ledger line, so total
-- platform revenue could not be reconstructed from LedgerEntry alone.
ALTER TYPE "LedgerEntryType" ADD VALUE 'PLATFORM_FEE_SELLER';

CREATE TABLE "Visitor" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "firstTouchAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstUtmSource" TEXT,
    "firstUtmMedium" TEXT,
    "firstUtmCampaign" TEXT,
    "firstUtmContent" TEXT,
    "firstUtmTerm" TEXT,
    "firstReferrer" TEXT,
    "firstLandingPath" TEXT,
    "lastTouchAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUtmSource" TEXT,
    "lastUtmMedium" TEXT,
    "lastUtmCampaign" TEXT,
    "lastUtmContent" TEXT,
    "lastUtmTerm" TEXT,
    "lastReferrer" TEXT,
    "lastLandingPath" TEXT,

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Visitor_userId_key" ON "Visitor"("userId");

CREATE TYPE "AnalyticsEventType" AS ENUM (
    'SITE_VISIT',
    'LISTING_VIEWED',
    'FAVORITE_ADDED',
    'FAVORITE_REMOVED',
    'CHECKOUT_STARTED',
    'PAYMENT_STARTED',
    'PAYMENT_FAILED',
    'SELL_WIZARD_STARTED'
);

CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "type" "AnalyticsEventType" NOT NULL,
    "visitorId" TEXT,
    "userId" TEXT,
    "listingId" TEXT,
    "eventId" TEXT,
    "orderId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnalyticsEvent_listingId_type_idx" ON "AnalyticsEvent"("listingId", "type");
CREATE INDEX "AnalyticsEvent_type_createdAt_idx" ON "AnalyticsEvent"("type", "createdAt");
CREATE INDEX "AnalyticsEvent_userId_idx" ON "AnalyticsEvent"("userId");
CREATE INDEX "AnalyticsEvent_visitorId_idx" ON "AnalyticsEvent"("visitorId");
CREATE INDEX "AnalyticsEvent_orderId_idx" ON "AnalyticsEvent"("orderId");
