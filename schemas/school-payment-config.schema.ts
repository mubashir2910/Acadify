import { z } from "zod"

export const PAYMENT_MODES = ["FULL_MANUAL", "FULL_ONLINE", "HYBRID"] as const
export const LATE_FEE_TYPES = ["FIXED", "PERCENT"] as const
export const LATE_FEE_ACCRUALS = ["MONTHLY", "DAILY", "ONE_TIME"] as const
export const PAYMENT_GATEWAYS = ["RAZORPAY", "CASHFREE", "STRIPE"] as const

const gatewayFieldsSchema = z.object({
  gatewayProvider: z.enum(PAYMENT_GATEWAYS).optional().nullable(),
  gatewayKeyId: z.string().max(200).optional().nullable(),
  gatewayKeySecret: z.string().max(500).optional().nullable(),
  gatewayWebhookSecret: z.string().max(500).optional().nullable(),
})

const lateFeeDefaultsSchema = z.object({
  defaultLateFeeEnabled: z.boolean().optional(),
  defaultLateFeeType: z.enum(LATE_FEE_TYPES).optional().nullable(),
  defaultLateFeeValue: z.coerce.number().min(0).max(99999999.99).optional().nullable(),
  defaultLateFeeGraceDayOfMonth: z.coerce.number().int().min(1).max(31).optional().nullable(),
  defaultLateFeeFrequency: z.enum(LATE_FEE_ACCRUALS).optional().nullable(),
})

// Bank, UPI, and QR are managed via separate per-account endpoints
// (SchoolBankAccount / SchoolUpiAccount / SchoolQrCode tables), not via this config.
// This schema covers only mode, currency, gateway, and late-fee policy.
export const paymentConfigSchema = z
  .object({
    paymentMode: z.enum(PAYMENT_MODES),
    currency: z.string().min(3).max(8).optional(),
  })
  .merge(gatewayFieldsSchema)
  .merge(lateFeeDefaultsSchema)
  .superRefine((data, ctx) => {
    if (data.defaultLateFeeEnabled) {
      if (!data.defaultLateFeeType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Late fee type is required when late fees are enabled",
          path: ["defaultLateFeeType"],
        })
      }
      if (data.defaultLateFeeValue == null || data.defaultLateFeeValue <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Late fee value must be greater than 0",
          path: ["defaultLateFeeValue"],
        })
      }
      if (
        data.defaultLateFeeGraceDayOfMonth == null ||
        data.defaultLateFeeGraceDayOfMonth < 1 ||
        data.defaultLateFeeGraceDayOfMonth > 31
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Grace day of month must be between 1 and 31",
          path: ["defaultLateFeeGraceDayOfMonth"],
        })
      }
      if (data.defaultLateFeeType === "PERCENT" && (data.defaultLateFeeValue ?? 0) > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Percent late fee cannot exceed 100",
          path: ["defaultLateFeeValue"],
        })
      }
    }
  })

export type PaymentConfigInput = z.infer<typeof paymentConfigSchema>
