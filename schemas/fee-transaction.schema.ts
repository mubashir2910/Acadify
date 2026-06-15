import { z } from "zod"

export const PAYMENT_METHODS = [
  "CASH",
  "UPI_OFFLINE",
  "BANK_TRANSFER",
  "CHEQUE",
  "UPI_ONLINE",
  "CARD",
  "NETBANKING",
  "WALLET",
  "OTHER",
] as const

export const TRANSACTION_STATUSES = [
  "PENDING_VERIFICATION",
  "VERIFIED",
  "REJECTED",
  "REFUNDED",
  "CANCELLED",
] as const

export const allocationSchema = z
  .object({
    ledgerId: z.string().uuid().optional(),
    monthlyLateFeeId: z.string().uuid().optional(),
    amountApplied: z.coerce.number().positive("Allocation amount must be > 0").max(99999999.99),
  })
  .superRefine((a, ctx) => {
    const hasLedger = !!a.ledgerId
    const hasLate = !!a.monthlyLateFeeId
    if (hasLedger === hasLate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each allocation must target either a ledger row or a monthly late fee — not both",
        path: ["ledgerId"],
      })
    }
  })

export type AllocationInput = z.infer<typeof allocationSchema>

// Admin records a manual payment (cash, manual UPI, bank-deposit recorded by admin)
export const manualPaymentSchema = z
  .object({
    studentId: z.string().uuid(),
    amount: z.coerce.number().positive("Amount must be > 0").max(99999999.99),
    method: z.enum(PAYMENT_METHODS),
    paidAt: z
      .string()
      .min(1, "Paid date is required")
      .refine(
        (s) => {
          const d = new Date(s)
          if (Number.isNaN(d.getTime())) return false
          // L2: sane window — not more than 90 days in the future, not
          // more than 10 years in the past. Catches typos like "2206-06-04"
          // before they corrupt monthly-collections reports.
          const now = Date.now()
          const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000
          const TEN_YEARS = 10 * 365 * 24 * 60 * 60 * 1000
          return d.getTime() <= now + NINETY_DAYS && d.getTime() >= now - TEN_YEARS
        },
        { message: "Paid date is outside the allowed range" },
      ),
    externalTxnRef: z.string().max(64).optional().nullable(),
    proofUrl: z.string().url().max(500).optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
    allocations: z.array(allocationSchema).min(1, "At least one allocation is required").max(100, "Too many allocations"),
  })
  .superRefine((d, ctx) => {
    const sum = d.allocations.reduce((s, a) => s + a.amountApplied, 0)
    if (Math.round(sum * 100) !== Math.round(d.amount * 100)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Allocations sum (${sum.toFixed(2)}) must equal amount (${d.amount.toFixed(2)})`,
        path: ["allocations"],
      })
    }
    const keys = d.allocations.map((a) => a.ledgerId ?? `mlf:${a.monthlyLateFeeId}`)
    if (new Set(keys).size !== keys.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate allocation target",
        path: ["allocations"],
      })
    }
  })

export type ManualPaymentInput = z.infer<typeof manualPaymentSchema>

// Student/parent uploads proof for hybrid flow — 12-digit UPI reference + proof image required
export const hybridUploadSchema = z
  .object({
    amount: z.coerce.number().positive("Amount must be > 0").max(99999999.99),
    method: z.enum(["UPI_OFFLINE", "BANK_TRANSFER", "CHEQUE"]),
    externalTxnRef: z
      .string()
      .trim()
      .min(6, "Reference must be at least 6 characters")
      .max(40, "Reference is too long"),
    proofUrl: z.string().url("Payment proof is required").max(500),
    paidAt: z
      .string()
      .min(1, "Paid date is required")
      .refine(
        (s) => {
          const d = new Date(s)
          if (Number.isNaN(d.getTime())) return false
          // L2: sane window — not more than 90 days in the future, not
          // more than 10 years in the past. Catches typos like "2206-06-04"
          // before they corrupt monthly-collections reports.
          const now = Date.now()
          const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000
          const TEN_YEARS = 10 * 365 * 24 * 60 * 60 * 1000
          return d.getTime() <= now + NINETY_DAYS && d.getTime() >= now - TEN_YEARS
        },
        { message: "Paid date is outside the allowed range" },
      ),
    notes: z.string().max(500).optional().nullable(),
    allocations: z.array(allocationSchema).min(1, "At least one allocation is required").max(100, "Too many allocations"),
  })
  .superRefine((d, ctx) => {
    const sum = d.allocations.reduce((s, a) => s + a.amountApplied, 0)
    if (Math.round(sum * 100) !== Math.round(d.amount * 100)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Allocations sum (${sum.toFixed(2)}) must equal amount (${d.amount.toFixed(2)})`,
        path: ["allocations"],
      })
    }
    // Reject crafted payloads that target the same ledger/late-fee row
    // twice. Mirrors the guard in manualPaymentSchema. (Audit H2.)
    const keys = d.allocations.map((a) => a.ledgerId ?? `mlf:${a.monthlyLateFeeId}`)
    if (new Set(keys).size !== keys.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate allocation target",
        path: ["allocations"],
      })
    }
  })

export type HybridUploadInput = z.infer<typeof hybridUploadSchema>

export const verifyTransactionSchema = z.object({
  notes: z.string().max(500).optional().nullable(),
})

export type VerifyTransactionInput = z.infer<typeof verifyTransactionSchema>

export const rejectTransactionSchema = z.object({
  reason: z.string().min(5, "Reason must be at least 5 characters").max(500),
})

export type RejectTransactionInput = z.infer<typeof rejectTransactionSchema>

export const editTransactionSchema = z
  .object({
    amount: z.coerce.number().positive().max(99999999.99).optional(),
    method: z.enum(PAYMENT_METHODS).optional(),
    paidAt: z.string().optional(),
    externalTxnRef: z.string().max(64).optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
    allocations: z.array(allocationSchema).min(1).max(100, "Too many allocations").optional(),
    reason: z.string().min(3, "Reason is required for edits").max(500),
  })
  .superRefine((d, ctx) => {
    if (d.allocations && d.amount !== undefined) {
      const sum = d.allocations.reduce((s, a) => s + a.amountApplied, 0)
      if (Math.round(sum * 100) !== Math.round(d.amount * 100)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Allocations must sum to amount",
          path: ["allocations"],
        })
      }
    }
  })

export type EditTransactionInput = z.infer<typeof editTransactionSchema>

export const transactionQuerySchema = z.object({
  status: z.enum(TRANSACTION_STATUSES).optional(),
  studentId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  // M5: capped at 100 (was 500) — see fee-ledger.schema.ts comment.
  pageSize: z.coerce.number().int().min(10).max(100).default(50),
})

export type TransactionQuery = z.infer<typeof transactionQuerySchema>
