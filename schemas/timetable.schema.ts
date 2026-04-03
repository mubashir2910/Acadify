import { z } from "zod"

// ─── Enums ───────────────────────────────────────────────────────────────────

export const dayOfWeekEnum = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
])

export type DayOfWeek = z.infer<typeof dayOfWeekEnum>

export const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
}

export const ALL_DAYS: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]

const timeStringSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Time must be in HH:mm format (e.g. 08:00)")

// ─── Period Schemas ───────────────────────────────────────────────────────────

export const createPeriodSchema = z
  .object({
    label: z.string().min(1, "Label is required").max(50, "Label too long"),
    start_time: timeStringSchema,
    end_time: timeStringSchema,
    is_break: z.boolean().default(false),
    order: z.number().int().min(1, "Order must be a positive integer"),
  })
  .refine((d) => d.end_time > d.start_time, {
    message: "End time must be after start time",
    path: ["end_time"],
  })

export const updatePeriodSchema = z
  .object({
    label: z.string().min(1).max(50).optional(),
    start_time: timeStringSchema.optional(),
    end_time: timeStringSchema.optional(),
    is_break: z.boolean().optional(),
    order: z.number().int().min(1).optional(),
  })

export const reorderPeriodsSchema = z.object({
  periods: z
    .array(z.object({ id: z.string().uuid(), order: z.number().int().min(1) }))
    .min(1),
})

// ─── Timetable Entry Schemas ──────────────────────────────────────────────────

export const assignTimetableSchema = z.object({
  period_id: z.string().uuid("Invalid period"),
  day_of_week: dayOfWeekEnum,
  teacher_id: z.string().uuid("Invalid teacher"),
  subject: z.string().min(1, "Subject is required").max(100, "Subject too long"),
  class: z.string().min(1, "Class is required"),
  section: z.string().min(1, "Section is required"),
})

export const updateTimetableSchema = assignTimetableSchema.partial().extend({
  id: z.string().uuid("Invalid entry id"),
})

export const deleteTimetableSchema = z.object({
  id: z.string().uuid(),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreatePeriodInput = z.infer<typeof createPeriodSchema>
export type UpdatePeriodInput = z.infer<typeof updatePeriodSchema>
export type ReorderPeriodsInput = z.infer<typeof reorderPeriodsSchema>
export type AssignTimetableInput = z.infer<typeof assignTimetableSchema>
export type UpdateTimetableInput = z.infer<typeof updateTimetableSchema>

// ─── Response Types ───────────────────────────────────────────────────────────

export interface PeriodRow {
  id: string
  label: string
  start_time: string
  end_time: string
  is_break: boolean
  order: number
}

export interface TimetableCell {
  id: string
  period_id: string
  day_of_week: DayOfWeek
  teacher_id: string
  teacher_name: string
  subject: string
  class: string
  section: string
}

// Grid row: one teacher, their assignments keyed by period_id
export interface TimetableGridTeacherRow {
  teacher_id: string
  teacher_name: string
  // key = period_id, value = cell or null (not assigned for this period)
  cells: Record<string, TimetableCell | null>
}

export interface TimetableGrid {
  periods: PeriodRow[]
  rows: TimetableGridTeacherRow[]
}

// Student view
export interface StudentPeriodCell {
  period_id: string
  label: string
  start_time: string
  end_time: string
  is_break: boolean
  subject: string | null
  teacher_name: string | null
}

export interface StudentTimetableDay {
  day: DayOfWeek
  cells: StudentPeriodCell[]
}

// Teacher dashboard: today's schedule (flat list for current day)
export interface TeacherTodayPeriod {
  label: string
  startTime: string
  endTime: string
  isBreak: boolean
  subject: string | null
  class: string | null
  section: string | null
}
