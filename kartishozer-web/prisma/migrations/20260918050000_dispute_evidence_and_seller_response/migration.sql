-- P1: disputes previously collected only the buyer's initial reason and
-- the admin's eventual resolution — the seller had no way to respond,
-- and neither side could attach supporting evidence. This is data
-- collection only (per the user's explicit instruction: no automated
-- decision-making is being built here) so whatever dispute-handling
-- rules get defined later have real evidence to work from.
ALTER TABLE "Dispute" ADD COLUMN "sellerResponse" TEXT;
ALTER TABLE "Dispute" ADD COLUMN "sellerRespondedAt" TIMESTAMP(3);

CREATE TYPE "DisputeEvidenceUploader" AS ENUM ('BUYER', 'SELLER', 'ADMIN');

CREATE TABLE "DisputeEvidence" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploaderRole" "DisputeEvidenceUploader" NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeEvidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DisputeEvidence_disputeId_idx" ON "DisputeEvidence"("disputeId");

ALTER TABLE "DisputeEvidence" ADD CONSTRAINT "DisputeEvidence_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisputeEvidence" ADD CONSTRAINT "DisputeEvidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
