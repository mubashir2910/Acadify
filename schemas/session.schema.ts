import { z } from "zod"

export const createSessionSchema = z
  .object({
    name: z
      .string()
      .min(2, "Session name must be at least 2 characters")
      .max(20, "Session name must not exceed 20 characters")
      .regex(
        /^[0-9A-Za-z\- ]+$/,
        "Session name may only contain letters, numbers, spaces and dashes",
      ),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    isCurrent: z.boolean().optional(),
  })
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  })

export type CreateSessionInput = z.infer<typeof createSessionSchema>

export const updateSessionSchema = z.object({
  isCurrent: z.boolean().optional(),
})

export type UpdateSessionInput = z.infer<typeof updateSessionSchema>
