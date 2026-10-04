-- Rename PaymentMethod.B_KASH to BKASH.
--
-- The extra underscore was the only separator in this enum and read oddly in
-- raw exports and reports ("B_KASH"). Renamed in place so existing rows keep
-- their value: RENAME VALUE rewrites the enum metadata only, with no table
-- rewrite and no change to the value's sort position.
--
-- The type is a quoted, case-sensitive identifier in this database, so regtype
-- must be written as '"PaymentMethod"' rather than 'PaymentMethod'.
-- Idempotent so a retry after a partial failure is safe.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = '"PaymentMethod"'::regtype AND enumlabel = 'B_KASH'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = '"PaymentMethod"'::regtype AND enumlabel = 'BKASH'
  ) THEN
    ALTER TYPE "PaymentMethod" RENAME VALUE 'B_KASH' TO 'BKASH';
  END IF;
END$$;