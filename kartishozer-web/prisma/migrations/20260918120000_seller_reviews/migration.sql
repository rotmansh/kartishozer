-- A buyer's 1-5 rating of the seller on one specific completed order (see
-- SellerReview in schema.prisma) — one review per order, never edited.
CREATE TABLE "SellerReview" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellerReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SellerReview_orderId_key" ON "SellerReview"("orderId");
CREATE INDEX "SellerReview_vendorId_idx" ON "SellerReview"("vendorId");

ALTER TABLE "SellerReview" ADD CONSTRAINT "SellerReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SellerReview" ADD CONSTRAINT "SellerReview_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SellerReview" ADD CONSTRAINT "SellerReview_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
