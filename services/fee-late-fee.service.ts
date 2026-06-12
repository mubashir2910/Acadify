/**
 * @deprecated Per-row late fees have been replaced by per-month-block late fees.
 * Use `services/fee-monthly-late-fee.service.ts` instead. This file is kept as
 * a stub re-export for any straggling imports; all functionality has moved.
 */
export {
  accrueMonthlyLateFees as accrueLateFees,
  waiveMonthlyLateFee as waiveLateFee,
} from "./fee-monthly-late-fee.service"
