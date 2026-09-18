-- A buyer's "notify me" request for a sold-out event (see EventWaitlist in
-- schema.prisma) — one-shot, deleted once the waitlist is notified.
CREATE TABLE "EventWaitlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventWaitlist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventWaitlist_userId_eventId_key" ON "EventWaitlist"("userId", "eventId");
CREATE INDEX "EventWaitlist_eventId_idx" ON "EventWaitlist"("eventId");

ALTER TABLE "EventWaitlist" ADD CONSTRAINT "EventWaitlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventWaitlist" ADD CONSTRAINT "EventWaitlist_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
