import { z } from "zod"

export const createClassLogSchema = z.object({
  timetableId: z.string().uuid("Invalid timetable ID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  topic: z.string().min(1, "Topic is required").max(200, "Topic must be 200 characters or less"),
  description: z.string().max(1000, "Description must be 1000 characters or less").optional(),
  attachmentUrl: z.string().url("Invalid attachment URL").optional(),
  attachmentType: z.enum(["pdf", "image"]).optional(),
})

export const classLogQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  class: z.string().optional(),
  section: z.string().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  missing: z.string().optional(), // "true" for missing logs query
  view: z.enum(["dashboard", "history"]).optional(), // admin: personal teaching view
})

export type CreateClassLogInput = z.infer<typeof createClassLogSchema>
export type ClassLogQuery = z.infer<typeof classLogQuerySchema>
