-- P0 fix: ListingRisk was a single row per listing, overwritten on every
-- re-assessment (creation, price/quantity edit, duplicate-file detection)
-- — the previous score and flags were silently lost each time. This adds
-- an append-only history table alongside it; nothing about ListingRisk's
-- existing shape or behavior changes, so no existing read/write is
-- affected. Existing listings simply have no history rows before this
-- migration (their current state is unaffected and still visible via
-- ListingRisk) — a backfill would need to fabricate trigger/timestamp
-- data that was never actually recorded, so this deliberately doesn't
-- attempt one.
CREATE TYPE "RiskAssessmentTrigger" AS ENUM ('LISTING_CREATED', 'PRICE_OR_QUANTITY_EDITED', 'DUPLICATE_FILE_DETECTED');

CREATE TABLE "RiskAssessmentEvent" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "riskEngineVersion" TEXT NOT NULL,
    "trigger" "RiskAssessmentTrigger" NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "decision" TEXT NOT NULL,
    "duplicateBarcode" BOOLEAN NOT NULL,
    "duplicatePdfHash" BOOLEAN NOT NULL,
    "suspiciousFaceValue" BOOLEAN NOT NULL,
    "highRiskAccount" BOOLEAN NOT NULL,
    "bulkListingFlag" BOOLEAN NOT NULL,
    "repeatEventFlag" BOOLEAN NOT NULL,
    "highQuantityFlag" BOOLEAN NOT NULL,
    "highValueTicketFlag" BOOLEAN NOT NULL,
    "pastDisputeFlag" BOOLEAN NOT NULL,
    "trustedSellerCredit" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskAssessmentEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RiskAssessmentEvent_listingId_idx" ON "RiskAssessmentEvent"("listingId");
CREATE INDEX "RiskAssessmentEvent_vendorId_idx" ON "RiskAssessmentEvent"("vendorId");
CREATE INDEX "RiskAssessmentEvent_createdAt_idx" ON "RiskAssessmentEvent"("createdAt");

ALTER TABLE "RiskAssessmentEvent" ADD CONSTRAINT "RiskAssessmentEvent_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskAssessmentEvent" ADD CONSTRAINT "RiskAssessmentEvent_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- So the current-state row also records which algorithm version produced
-- it, not only the history table.
ALTER TABLE "ListingRisk" ADD COLUMN "riskEngineVersion" TEXT NOT NULL DEFAULT 'v1';
