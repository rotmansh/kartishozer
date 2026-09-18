-- P1: Order.status and Payout.status only ever hold the current state —
-- there was no record of *when* a payment was captured, a payout was
-- held/resumed/released, or a refund completed, only what the state is
-- right now. This adds an append-only event log alongside both, wired in
-- at every point the application code already changes that state.
CREATE TYPE "PaymentEventType" AS ENUM (
    'PAYMENT_INITIATED', 'PAYMENT_AUTHORIZED', 'PAYMENT_CAPTURED', 'PAYMENT_FAILED',
    'PAYOUT_SCHEDULED', 'PAYOUT_HELD', 'PAYOUT_RESUMED', 'PAYOUT_PROCESSING_STARTED', 'PAYOUT_CANCELLED',
    'REFUND_INITIATED', 'REFUND_COMPLETED', 'CHARGEBACK_OPENED', 'CHARGEBACK_RESOLVED'
);

CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "payoutId" TEXT,
    "type" "PaymentEventType" NOT NULL,
    "provider" TEXT NOT NULL,
    "providerReference" TEXT,
    "amountAgorot" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "status" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentEvent_orderId_idx" ON "PaymentEvent"("orderId");
CREATE INDEX "PaymentEvent_payoutId_idx" ON "PaymentEvent"("payoutId");
CREATE INDEX "PaymentEvent_type_idx" ON "PaymentEvent"("type");
CREATE INDEX "PaymentEvent_createdAt_idx" ON "PaymentEvent"("createdAt");

ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
