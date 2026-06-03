-- =========================================================================
-- Manual migration: defence-in-depth constraints on FeePaymentAllocation.
-- Apply with:
--   npx prisma db execute --file prisma/migrations/manual_fees_allocation_constraints/migration.sql --schema prisma/schema.prisma
--
-- Audit items M1 + M2:
--   M1) Force exactly-one of (ledger_id, monthly_late_fee_id) at the DB
--       level. The Zod schema already enforces this on the API boundary,
--       but a service path that bypasses Zod (or a future bulk insert)
--       could otherwise create an orphan allocation row with both FKs
--       NULL, silently corrupting SUM(amount_applied) queries.
--   M2) Postgres treats NULLs as distinct in UNIQUE constraints. The
--       existing `@@unique([transaction_id, ledger_id])` and the parallel
--       one on `monthly_late_fee_id` therefore don't prevent two
--       allocation rows for the same transaction when the OTHER FK is
--       NULL. Partial unique indexes (filtered on `IS NOT NULL`) plug
--       that gap.
-- =========================================================================

-- M1: CHECK constraint — exactly one of the two FKs must be NOT NULL.
ALTER TABLE "FeePaymentAllocation"
DROP CONSTRAINT IF EXISTS "fee_allocation_exactly_one_target";

ALTER TABLE "FeePaymentAllocation"
ADD CONSTRAINT "fee_allocation_exactly_one_target"
CHECK (
  (ledger_id IS NOT NULL)::int + (monthly_late_fee_id IS NOT NULL)::int = 1
);

-- M2: partial unique indexes that ignore NULL.
DROP INDEX IF EXISTS "fee_allocation_unique_ledger_per_txn";
CREATE UNIQUE INDEX "fee_allocation_unique_ledger_per_txn"
ON "FeePaymentAllocation" (transaction_id, ledger_id)
WHERE ledger_id IS NOT NULL;

DROP INDEX IF EXISTS "fee_allocation_unique_late_fee_per_txn";
CREATE UNIQUE INDEX "fee_allocation_unique_late_fee_per_txn"
ON "FeePaymentAllocation" (transaction_id, monthly_late_fee_id)
WHERE monthly_late_fee_id IS NOT NULL;
