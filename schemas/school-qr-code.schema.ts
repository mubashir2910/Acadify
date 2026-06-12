import { z } from "zod"

export const createQrCodeSchema = z.object({
  imageUrl: z.string().url("Image URL is required"),
  caption: z
    .string()
    .trim()
    .min(2, "Caption is required (describe which bank/UPI this QR points to)")
    .max(200),
  label: z.string().trim().max(50).optional().nullable(),
  bankAccountId: z.string().uuid().optional().nullable(),
})
export type CreateQrCodeInput = z.infer<typeof createQrCodeSchema>

export const updateQrCodeSchema = createQrCodeSchema.partial()
export type UpdateQrCodeInput = z.infer<typeof updateQrCodeSchema>
