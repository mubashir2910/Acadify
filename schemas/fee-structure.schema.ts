import { z } from "zod"

export const FEE_CATEGORIES = [
  "TUITION",
  "TRANSPORT",
  "LAB",
  "LIBRARY",
  "EXAM",
  "SESSION",
  "ACTIVITY",
  "MISC",
] as const

// ONE_TIME removed — admins now pick the single applicable month explicitly
export const FEE_FREQUENCIES = ["MONTHLY", "QUARTERLY", "HALF_YEARLY", "ANNUAL"] as const

export const appliedMonthSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  dueDay: z.coerce.number().int().min(1).max(31).optional().nullable(),
})

export type AppliedMonthInput = z.infer<typeof appliedMonthSchema>

export const feeHeadSchema = z
  .object({
    name: z.string().min(1, "Fee head name is required").max(100),
    category: z.enum(FEE_CATEGORIES),
    frequency: z.enum(FEE_FREQUENCIES),
    amount: z.coerce
      .number()
      .min(0, "Amount must be 0 or more")
      .max(99999999.99, "Amount is too large")
      .refine((v) => Number.isFinite(v) && Math.round(v * 100) === v * 100, {
        message: "Amount may have at most 2 decimal places",
      }),
    dueDayOfMonth: z.coerce.number().int().min(1).max(28).optional().nullable(),
    dueMonth: z.coerce.number().int().min(1).max(12).optional().nullable(),
    isOptional: z.boolean().optional().default(false),
    sortOrder: z.coerce.number().int().min(0).default(0),
    // When non-empty, overrides frequency-based period expansion.
    appliedMonths: z.array(appliedMonthSchema).optional().default([]),
  })
  .superRefine((head, ctx) => {
    const hasApplied = (head.appliedMonths?.length ?? 0) > 0
    if (hasApplied) {
      // appliedMonths takes precedence — frequency/due fields aren't required
      return
    }
    if (head.frequency === "MONTHLY" && head.dueDayOfMonth == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Monthly fees require a due day of month",
        path: ["dueDayOfMonth"],
      })
    }
    if (head.frequency !== "MONTHLY" && head.dueMonth == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Non-monthly fees require a due month",
        path: ["dueMonth"],
      })
    }
  })

export type FeeHeadInput = z.infer<typeof feeHeadSchema>

export const createFeeStructureSchema = z
  .object({
    sessionId: z.string().uuid("Session is required"),
    // Multiple classes can share the same structure definition; the service
    // fans out and creates one FeeStructure row per class in a single
    // transaction. Section can only narrow when exactly one class is chosen.
    classes: z
      .array(z.string().min(1).max(20))
      .min(1, "Pick at least one class")
      .transform((arr) => Array.from(new Set(arr))),
    section: z.string().min(1).max(10).optional().nullable(),
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    effectiveFrom: z.string().min(1, "Effective from is required"),
    effectiveTo: z.string().optional().nullable(),
    feeHeads: z.array(feeHeadSchema).min(1, "At least one fee head is required"),
  })
  .superRefine((data, ctx) => {
    if (data.effectiveTo && new Date(data.effectiveTo) <= new Date(data.effectiveFrom)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Effective-to must be after effective-from",
        path: ["effectiveTo"],
      })
    }
    if (data.section && data.classes.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "A section can only be set when one class is selected. Clear the section to apply to multiple classes.",
        path: ["section"],
      })
    }
    const names = data.feeHeads.map((h) => h.name.trim().toLowerCase())
    if (new Set(names).size !== names.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Fee head names must be unique within a structure",
        path: ["feeHeads"],
      })
    }
  })

export type CreateFeeStructureInput = z.infer<typeof createFeeStructureSchema>

export const updateFeeStructureSchema = createFeeStructureSchema
export type UpdateFeeStructureInput = z.infer<typeof updateFeeStructureSchema>
