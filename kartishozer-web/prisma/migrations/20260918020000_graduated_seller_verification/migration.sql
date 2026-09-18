-- Every vendor already completed Clerk's own signup verification before
-- they could exist at all, so BASIC (not NONE) is the true starting
-- tier. Backfill existing rows still sitting at the old default, and
-- change the column default so new vendors start there too.
ALTER TABLE "Vendor" ALTER COLUMN "verificationLevel" SET DEFAULT 'BASIC';
UPDATE "Vendor" SET "verificationLevel" = 'BASIC' WHERE "verificationLevel" = 'NONE';

-- Self-reported "the seller will use the ticket provider's own official
-- transfer feature" — a preferred signal shown to buyers, not a verified
-- fact (see the schema comment on this column).
ALTER TABLE "Listing" ADD COLUMN "offersOfficialTransfer" BOOLEAN NOT NULL DEFAULT false;
