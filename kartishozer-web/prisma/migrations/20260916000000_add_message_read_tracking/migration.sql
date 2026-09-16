-- Track per-side "last read" timestamps on Conversation so the app can
-- show buyers/sellers when the other side has sent a message they
-- haven't seen yet.
ALTER TABLE "Conversation" ADD COLUMN "buyerLastReadAt" TIMESTAMP(3);
ALTER TABLE "Conversation" ADD COLUMN "sellerLastReadAt" TIMESTAMP(3);
