import { z } from "zod"

export const changeSchoolCodeSchema = z.object({
  // Caller must echo the current school code verbatim — guards against
  // accidental rename of a wrong school.
  currentSchoolCode: z
    .string()
    .min(2, "Current school code is required")
    .max(5, "Current school code is too long"),
  newSchoolCode: z
    .string()
    .trim()
    .min(2, "New school code must be at least 2 characters")
    .max(5, "New school code must not exceed 5 characters")
    .regex(/^[A-Za-z0-9_-]+$/, "Use only letters, numbers, hyphens, or underscores"),
})

export type ChangeSchoolCodeInput = z.infer<typeof changeSchoolCodeSchema>
