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
  .regex(
    /^([01]\d|2[0-3]):[0-5]\d$/,
    "Time must be in HH:mm format (24-hour, e.g. 08:00)",
  )

// ─── Period Schemas ───────────────────────────────────────────────────────────

export const createPeriodSchema = z
  .object({
    group_id: z.string().uuid("Invalid timetable group"),
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

export const updatePeriodSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  start_time: timeStringSchema.optional(),
  end_time: timeStringSchema.optional(),
  is_break: z.boolean().optional(),
  order: z.number().int().min(1).optional(),
})

export const reorderPeriodsSchema = z.object({
  group_id: z.string().uuid("Invalid timetable group"),
  periods: z
    .array(z.object({ id: z.string().uuid(), order: z.number().int().min(1) }))
    .min(1),
})

// ─── Timetable Entry Schemas ──────────────────────────────────────────────────

// Assignee is either an existing Teacher (teacher_id) or an admin user
// (admin_user_id). Exactly one must be present.
const timetableTargetRefine = (
  data: { teacher_id?: string; admin_user_id?: string },
  ctx: z.RefinementCtx,
) => {
  const hasTeacher = Boolean(data.teacher_id)
  const hasAdmin = Boolean(data.admin_user_id)
  if (hasTeacher === hasAdmin) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide either teacher_id or admin_user_id (not both)",
      path: ["teacher_id"],
    })
  }
}

export const assignTimetableSchema = z
  .object({
    group_id: z.string().uuid("Invalid timetable group"),
    period_id: z.string().uuid("Invalid period"),
    day_of_week: dayOfWeekEnum,
    teacher_id: z.string().uuid("Invalid teacher").optional(),
    admin_user_id: z.string().uuid("Invalid admin user").optional(),
    subject: z.string().trim().min(1, "Subject is required").max(100, "Subject too long"),
    class: z.string().trim().min(1, "Class is required"),
    section: z.string().trim().min(1, "Section is required"),
  })
  .superRefine(timetableTargetRefine)

// .partial() on an effect-wrapped schema isn't directly available; build manually.
export const updateTimetableSchema = z
  .object({
    id: z.string().uuid("Invalid entry id"),
    group_id: z.string().uuid("Invalid timetable group"),
    period_id: z.string().uuid().optional(),
    day_of_week: dayOfWeekEnum.optional(),
    teacher_id: z.string().uuid().optional(),
    admin_user_id: z.string().uuid().optional(),
    subject: z.string().trim().min(1).max(100).optional(),
    class: z.string().trim().min(1).optional(),
    section: z.string().trim().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    // Only enforce mutual-exclusivity if any assignee field was provided.
    if (data.teacher_id !== undefined || data.admin_user_id !== undefined) {
      timetableTargetRefine(
        { teacher_id: data.teacher_id, admin_user_id: data.admin_user_id },
        ctx,
      )
    }
  })

export const deleteTimetableSchema = z.object({
  id: z.string().uuid(),
  group_id: z.string().uuid("Invalid timetable group"),
})

// ─── Batch Schemas ────────────────────────────────────────────────────────────

const batchCreatePayload = z.object({
  period_id: z.string().uuid(),
  day_of_week: dayOfWeekEnum,
  teacher_id: z.string().uuid().optional(),
  admin_user_id: z.string().uuid().optional(),
  subject: z.string().trim().min(1).max(100),
  class: z.string().trim().min(1),
  section: z.string().trim().min(1),
})

const batchUpdatePayload = batchCreatePayload.partial()

export const batchChangeSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("CREATE"),
    /** Client-side tempId used to correlate the resulting cell back to the UI. */
    temp_id: z.string().min(1).optional(),
    input: batchCreatePayload,
  }),
  z.object({
    action: z.literal("UPDATE"),
    id: z.string().uuid(),
    input: batchUpdatePayload,
  }),
  z.object({
    action: z.literal("DELETE"),
    id: z.string().uuid(),
  }),
])

export const batchSaveSchema = z.object({
  group_id: z.string().uuid("Invalid timetable group"),
  // 200 covers realistic admin sessions (40 cells × 5 days = 200) without leaving
  // headroom for runaway batches that would hold the DB transaction open too long.
  changes: z
    .array(batchChangeSchema)
    .min(1, "No changes to save")
    .max(200, "Too many changes in one batch — split into smaller saves"),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreatePeriodInput = z.infer<typeof createPeriodSchema>
export type UpdatePeriodInput = z.infer<typeof updatePeriodSchema>
export type ReorderPeriodsInput = z.infer<typeof reorderPeriodsSchema>
export type AssignTimetableInput = z.infer<typeof assignTimetableSchema>
export type UpdateTimetableInput = z.infer<typeof updateTimetableSchema>
export type BatchChange = z.infer<typeof batchChangeSchema>
export type BatchSaveInput = z.infer<typeof batchSaveSchema>

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
  group_id: string
  period_id: string
  day_of_week: DayOfWeek
  teacher_id: string
  teacher_name: string
  subject: string
  class: string
  section: string
}

// Grid row: one participant (teacher OR admin), assignments keyed by period_id__day.
// Admins without a Teacher row yet appear as virtual rows so they can be
// assigned without leaving the grid — the backend materialises a Teacher row
// on save via ensureTeacherForUser.
export interface TimetableGridTeacherRowBase {
  name: string
  cells: Record<string, TimetableCell | null>
}

export interface TimetableGridTeacherRowTeacher extends TimetableGridTeacherRowBase {
  kind: "teacher"
  teacher_id: string
  /** Whether the Teacher row is currently ACTIVE. Inactive teachers stay in the
   * grid because their existing assignments do; the UI tags them with a badge
   * and prevents new assignments. */
  is_active: boolean
  /** True when the underlying SchoolUser holds the ADMIN role. Admins who were
   * assigned teaching duties get a Teacher row materialised, but they're still
   * admins — the grid renders the "Admin" badge based on this flag, not on
   * which Map they came from. */
  is_admin: boolean
}

export interface TimetableGridTeacherRowAdmin extends TimetableGridTeacherRowBase {
  kind: "admin"
  admin_user_id: string
}

export type TimetableGridParticipantRow =
  | TimetableGridTeacherRowTeacher
  | TimetableGridTeacherRowAdmin

/** @deprecated unused — kept only so older imports still resolve until removed in v3. */
export interface TimetableGridTeacherRow {
  teacher_id: string
  teacher_name: string
  cells: Record<string, TimetableCell | null>
}

export interface TimetableGrid {
  group_id: string
  group_name: string
  periods: PeriodRow[]
  rows: TimetableGridParticipantRow[]
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
  groupName: string | null
}

// Teacher routine entry (multi-group aware)
export interface TeacherRoutineEntry extends TimetableCell {
  group_name: string
  period_label: string
  period_start_time: string
  period_end_time: string
  period_order: number
}

export interface OverlapWarning {
  teacher_id: string
  teacher_name: string
  day_of_week: DayOfWeek
  existing_group_name: string
  existing_period_label: string
  existing_start_time: string
  existing_end_time: string
  conflicting_start_time: string
  conflicting_end_time: string
}

export interface BatchSaveResult {
  committed: number
  warnings: OverlapWarning[]
}
