import { z } from "zod"
import { isAllowedUploadUrl } from "@/lib/attachment"

// ─── Digital ID schemas ───────────────────────────────────────────────────────

/**
 * Body for PUT /api/digital-id — sets (or clears) the dedicated ID-card photo.
 * The URL must use an approved upload host so a crafted request cannot store an
 * arbitrary external link that other viewers would load.
 */
export const updateDigitalIdSchema = z.object({
  digitalIdPhoto: z
    .string()
    .url("Invalid photo URL")
    .max(500)
    .refine(isAllowedUploadUrl, "Photo must be an uploaded file")
    .nullable(),
})

export type UpdateDigitalIdInput = z.infer<typeof updateDigitalIdSchema>

/** The card payload returned by GET /api/digital-id and the public token lookup. */
export interface DigitalIdCard {
  name: string
  roleLabel: string
  schoolName: string | null
  classSection: string
  acadifyId: string
  photoUrl: string | null
  hasCustomPhoto: boolean
  shareToken: string | null
}
