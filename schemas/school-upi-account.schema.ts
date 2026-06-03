import { z } from "zod"

const UPI_REGEX = /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/

export const createUpiAccountSchema = z.object({
  upiId: z.string().trim().regex(UPI_REGEX, "Invalid UPI ID (e.g. school@bank)"),
  label: z.string().trim().max(50).optional().nullable(),
})
export type CreateUpiAccountInput = z.infer<typeof createUpiAccountSchema>

export const updateUpiAccountSchema = createUpiAccountSchema.partial()
export type UpdateUpiAccountInput = z.infer<typeof updateUpiAccountSchema>
