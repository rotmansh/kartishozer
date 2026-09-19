-- Order.faceValueAgorot: snapshotted at purchase time (see schema.prisma
-- doc comment) -- backfilled from the referenced Listing's current
-- faceValueAgorot, which is accurate for every pre-existing order since
-- partial-quantity purchases (the only thing that reduces a Listing's
-- faceValueAgorot after the fact) did not exist before this migration.
ALTER TABLE "Order" ADD COLUMN "faceValueAgorot" INTEGER;
UPDATE "Order" o SET "faceValueAgorot" = l."faceValueAgorot" FROM "Listing" l WHERE l.id = o."listingId";
ALTER TABLE "Order" ALTER COLUMN "faceValueAgorot" SET NOT NULL;

-- One-click resell tracking (see Order.resoldAsListingId doc comment).
ALTER TABLE "Order" ADD COLUMN "resoldAsListingId" TEXT;
CREATE UNIQUE INDEX "Order_resoldAsListingId_key" ON "Order"("resoldAsListingId");
ALTER TABLE "Order" ADD CONSTRAINT "Order_resoldAsListingId_fkey" FOREIGN KEY ("resoldAsListingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
