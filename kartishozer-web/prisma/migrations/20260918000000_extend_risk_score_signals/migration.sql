-- Extends the listing risk engine with real signals beyond account age
-- and daily listing volume: repeat listings of the same event by one
-- vendor, unusually large quantities, unusually expensive tickets, a
-- vendor's history of disputes resolved against them, and a credit for
-- vendors with a long track record of clean completed sales.
ALTER TABLE "ListingRisk" ADD COLUMN "repeatEventFlag" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ListingRisk" ADD COLUMN "highQuantityFlag" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ListingRisk" ADD COLUMN "highValueTicketFlag" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ListingRisk" ADD COLUMN "pastDisputeFlag" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ListingRisk" ADD COLUMN "trustedSellerCredit" BOOLEAN NOT NULL DEFAULT false;
