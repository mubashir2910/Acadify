import { z } from "zod"
import { SPACES_HOSTS } from "@/lib/attachment"

// ─── Digital ID schemas ───────────────────────────────────────────────────────

/**
 * Body for PUT /api/digital-id — sets (or clears) the dedicated ID-card photo.
 * The URL must live on one of our Spaces hosts so a crafted request can't store
 * an arbitrary external link that other viewers would load.
 */
export const updateDigitalIdSchema = z.object({
  digitalIdPhoto: z
    .string()
    .url("Invalid photo URL")
    .max(500)
    .refine((u) => {
      try {
        return SPACES_HOSTS.includes(new URL(u).host)
      } catch {
        return false
      }
    }, "Photo must be an uploaded file")
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
