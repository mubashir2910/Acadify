import { z } from "zod"

export const WAIVER_TYPES = ["PERCENT", "AMOUNT"] as const

export const createFeeWaiverSchema = z
  .object({
    studentId: z.string().uuid("Invalid student id"),
    sessionId: z.string().uuid("Session is required"),
    feeHeadId: z.string().uuid("Fee head is required"),
    periodYear: z.coerce.number().int().min(2000).max(2100),
    periodMonth: z.coerce.number().int().min(1).max(12),
    type: z.enum(WAIVER_TYPES),
    value: z.coerce.number().positive("Value must be greater than 0").max(99999999.99),
    reason: z.string().min(3, "Reason must be at least 3 characters").max(500),
  })
  .superRefine((d, ctx) => {
    if (d.type === "PERCENT" && d.value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Percent waiver cannot exceed 100",
        path: ["value"],
      })
    }
  })

export type CreateFeeWaiverInput = z.infer<typeof createFeeWaiverSchema>

export const revokeFeeWaiverSchema = z.object({
  reason: z.string().min(3, "Reason must be at least 3 characters").max(500),
})

export type RevokeFeeWaiverInput = z.infer<typeof revokeFeeWaiverSchema>
