import { z } from "zod"

export const dayTypeEnum = z.enum(["HOLIDAY", "WORKING_DAY", "HALF_DAY", "EVENT"])
export type DayType = z.infer<typeof dayTypeEnum>

export const calendarOverrideSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  type: dayTypeEnum,
  reason: z.string().max(100, "Reason must be 100 characters or less").optional(),
})
export type CalendarOverrideInput = z.infer<typeof calendarOverrideSchema>

export const calendarQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
})

export const calendarDeleteSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
})

export interface CalendarDayOverride {
  date: string
  type: "HOLIDAY" | "WORKING_DAY" | "HALF_DAY" | "EVENT"
  reason: string | null
}
