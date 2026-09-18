-- Three Data Foundation closes requested after the P2 audit. Purely
-- additive/relaxing — nothing existing is renamed, retyped, or removed.

-- 1) Pricing/fee versioning: a permanent, independent snapshot of the
-- fee rule that priced each order, written once at order-creation time.
CREATE TABLE "OrderPricing" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "pricingVersion" TEXT NOT NULL,
    "buyerFeePercent" DOUBLE PRECISION NOT NULL,
    "sellerFeePercent" DOUBLE PRECISION NOT NULL,
    "buyerFeeAgorot" INTEGER NOT NULL,
    "sellerFeeAgorot" INTEGER NOT NULL,
    "discountAgorot" INTEGER NOT NULL DEFAULT 0,
    "totalPaidByBuyerAgorot" INTEGER NOT NULL,
    "amountDueToSellerAgorot" INTEGER NOT NULL,
    "platformRevenueAgorot" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderPricing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderPricing_orderId_key" ON "OrderPricing"("orderId");
ALTER TABLE "OrderPricing" ADD CONSTRAINT "OrderPricing_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2) Configuration history: append-only, per-key version sequence.
CREATE TABLE "PlatformConfigVersion" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformConfigVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformConfigVersion_key_version_key" ON "PlatformConfigVersion"("key", "version");
CREATE INDEX "PlatformConfigVersion_key_effectiveFrom_idx" ON "PlatformConfigVersion"("key", "effectiveFrom");

-- 3) Visitor <-> User: allow one User to link to many Visitor rows (one
-- per browser/device), instead of at most one. Only the uniqueness is
-- relaxed; the column, its data, and every existing link are untouched.
DROP INDEX "Visitor_userId_key";
CREATE INDEX "Visitor_userId_idx" ON "Visitor"("userId");
