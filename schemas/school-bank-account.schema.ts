import { z } from "zod"

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/

export const createBankAccountSchema = z.object({
  label: z.string().trim().max(50).optional().nullable(),
  accountHolder: z.string().trim().min(2, "Account holder is required").max(100),
  bankName: z.string().trim().min(2, "Bank name is required").max(100),
  accountNumber: z.string().trim().min(6, "Account number too short").max(30),
  ifsc: z.string().trim().toUpperCase().regex(IFSC_REGEX, "Invalid IFSC code"),
  branch: z.string().trim().max(100).optional().nullable(),
  accountType: z.string().trim().max(30).optional().nullable(),
})
export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>

export const updateBankAccountSchema = createBankAccountSchema.partial()
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>
