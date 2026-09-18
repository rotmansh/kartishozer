-- Digital vault for uploaded ticket files: one file per listing, never
-- exposed to a buyer directly (only served through an authorization-gated
-- route), with a sha256 hash for exact-file duplicate detection.
CREATE TABLE "TicketFile" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketFile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TicketFile_listingId_key" ON "TicketFile"("listingId");
CREATE INDEX "TicketFile_sha256_idx" ON "TicketFile"("sha256");

ALTER TABLE "TicketFile" ADD CONSTRAINT "TicketFile_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
