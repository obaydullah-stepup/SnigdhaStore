-- Meta Purchase event tracking.
--
-- Adds the dedupe and retry bookkeeping for the Meta Purchase event, so an
-- order can never intentionally produce more than one Purchase.
--
-- `metaPurchaseEventId` is persisted rather than recomputed so every retry
-- reuses the same event ID and Meta can deduplicate the CAPI event against the
-- browser pixel event for orders sent in "immediately" mode.

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "metaPurchaseEventId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "metaPurchaseSent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "metaPurchaseSentAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "metaPurchaseError" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "metaPurchaseAttempts" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_metaPurchaseEventId_key" ON "Order"("metaPurchaseEventId");