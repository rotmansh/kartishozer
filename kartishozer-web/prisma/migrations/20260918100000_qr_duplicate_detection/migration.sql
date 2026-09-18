-- QR-content duplicate detection: catches a re-photographed/re-encoded
-- copy of the same physical ticket (different file bytes, same embedded
-- QR content), which the existing exact-file sha256 check misses.
ALTER TABLE "TicketFile" ADD COLUMN "qrContentHash" TEXT;
CREATE INDEX "TicketFile_qrContentHash_idx" ON "TicketFile"("qrContentHash");

ALTER TYPE "RiskAssessmentTrigger" ADD VALUE 'DUPLICATE_QR_DETECTED';
