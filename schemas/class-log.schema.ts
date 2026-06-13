import { z } from "zod"
import { attachmentUrlSchema } from "@/lib/attachment"

/**
 * A strict YYYY-MM-DD string that is also a real calendar date.
 * The regex alone accepts impossible values like "2026-13-99"; the refine
 * round-trips through Date (UTC) so malformed dates are rejected as 422 by the
 * API instead of reaching Prisma as an Invalid Date (which would 500).
 */
function isoDateString(label = "Date") {
  return z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be YYYY-MM-DD`)
    .refine((s) => {
      const [y, m, d] = s.split("-").map(Number)
      const dt = new Date(Date.UTC(y, m - 1, d))
      return (
        dt.getUTCFullYear() === y &&
        dt.getUTCMonth() === m - 1 &&
        dt.getUTCDate() === d
      )
    }, `${label} is not a valid calendar date`)
}

export const createClassLogSchema = z
  .object({
    timetableId: z.string().uuid("Invalid timetable ID"),
    date: isoDateString(),
    topic: z.string().min(1, "Topic is required").max(200, "Topic must be 200 characters or less"),
    description: z.string().max(1000, "Description must be 1000 characters or less").optional(),
    attachmentUrl: attachmentUrlSchema.optional(),
    attachmentType: z.enum(["pdf", "image"]).optional(),
  })
  // An attachment URL and its type must be provided together (or not at all).
  .refine((d) => (d.attachmentUrl ? !!d.attachmentType : !d.attachmentType), {
    message: "Attachment type is required with an attachment",
    path: ["attachmentType"],
  })

export const classLogQuerySchema = z
  .object({
    date: isoDateString().optional(),
    class: z.string().optional(),
    section: z.string().optional(),
    from: isoDateString("From date").optional(),
    to: isoDateString("To date").optional(),
    missing: z.string().optional(), // "true" → admin missing-logs query
    view: z.enum(["dashboard", "history"]).optional(), // personal teaching view
  })
  // When both ends of a range are present, enforce a sane order.
  .refine((q) => !(q.from && q.to) || q.from <= q.to, {
    message: "From date must be on or before To date",
    path: ["from"],
  })

export type CreateClassLogInput = z.infer<typeof createClassLogSchema>
export type ClassLogQuery = z.infer<typeof classLogQuerySchema>
