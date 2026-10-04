-- Rename PaymentStatus.PENDING to UNPAID.
--
-- "Pending" collided with OrderStatus.PENDING: the same order could show two
-- different "Pending" badges meaning unrelated things. RENAME VALUE is
-- preferred over dropping and re-adding the type because it preserves existing
-- rows (no data rewrite, no table lock beyond the enum metadata) and keeps the
-- value in its original sort position.
--
-- The type is a quoted, case-sensitive identifier in this database, so
-- regtype must be written as '"PaymentStatus"' rather than 'PaymentStatus'.
-- Idempotent so a retry after a partial failure is safe.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = '"PaymentStatus"'::regtype AND enumlabel = 'PENDING'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = '"PaymentStatus"'::regtype AND enumlabel = 'UNPAID'
  ) THEN
    ALTER TYPE "PaymentStatus" RENAME VALUE 'PENDING' TO 'UNPAID';
  END IF;
END$$;