import { z } from "zod"

export const LEDGER_STATUSES = ["PENDING", "PARTIAL", "PAID", "WAIVED", "OVERDUE"] as const

export const ledgerQuerySchema = z.object({
  sessionId: z.string().uuid().optional(),
  class: z.string().optional(),
  section: z.string().optional(),
  status: z.enum(LEDGER_STATUSES).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  studentId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  // M5: capped at 100 (was 500). A scripted attacker pulling full
  // history can fetch ~5x more requests now; lower ceilings nudge clients
  // toward proper pagination instead of full-table dumps.
  pageSize: z.coerce.number().int().min(10).max(100).default(100),
})

export type LedgerQuery = z.infer<typeof ledgerQuerySchema>

export const generateLedgerSchema = z.object({
  sessionId: z.string().uuid("Session is required"),
  class: z.string().min(1).max(20).optional(),
  section: z.string().min(1).max(10).optional(),
})

export type GenerateLedgerInput = z.infer<typeof generateLedgerSchema>

export const editLedgerSchema = z
  .object({
    expectedAmount: z.coerce.number().min(0).max(99999999.99).optional(),
    waiverAmount: z.coerce.number().min(0).max(99999999.99).optional(),
    dueDate: z.string().optional(),
    reason: z.string().min(3, "Reason is required for ledger edits").max(500),
  })
  .refine(
    (d) =>
      d.expectedAmount !== undefined || d.waiverAmount !== undefined || d.dueDate !== undefined,
    { message: "At least one field must be provided", path: ["expectedAmount"] },
  )

export type EditLedgerInput = z.infer<typeof editLedgerSchema>

export const waiveLateFeeSchema = z
  .object({
    type: z.enum(["AMOUNT", "PERCENT"]),
    value: z.coerce.number().positive("Value must be greater than 0"),
    reason: z.string().min(3, "Reason is required").max(500),
  })
  .refine((d) => d.type !== "PERCENT" || d.value <= 100, {
    message: "Percent must be ≤ 100",
    path: ["value"],
  })

export type WaiveLateFeeInput = z.infer<typeof waiveLateFeeSchema>

export const accrueLateFeesSchema = z.object({
  sessionId: z.string().uuid().optional(),
  class: z.string().optional(),
  section: z.string().optional(),
})

export type AccrueLateFeesInput = z.infer<typeof accrueLateFeesSchema>
