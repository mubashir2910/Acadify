import { z } from "zod"

// ─── Admin: batch submit teacher attendance (POST) ──────────────────────────

export const submitTeacherAttendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  records: z
    .array(
      z.object({
        teacherId: z.string().uuid(),
        status: z.enum(["PRESENT", "ABSENT", "LATE"]),
      })
    )
    .min(1, "At least one record required"),
})

export type SubmitTeacherAttendanceInput = z.infer<typeof submitTeacherAttendanceSchema>

// ─── Admin: edit single teacher attendance (PATCH) ──────────────────────────

export const editTeacherAttendanceSchema = z.object({
  teacherId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  status: z.enum(["PRESENT", "ABSENT", "LATE"]),
})

export type EditTeacherAttendanceInput = z.infer<typeof editTeacherAttendanceSchema>

// ─── Shared types ────────────────────────────────────────────────────────────

export type TeacherAttendanceRecord = {
  teacherId: string
  userId: string
  name: string
  employeeId: string
  profilePicture: string | null
  status: "PRESENT" | "ABSENT" | "LATE" | null
  lastEditedAt: string | null
  lastEditedBy: string | null
}

export type TeacherAttendanceSummaryStats = {
  totalPresent: number
  totalAbsent: number
  totalLate: number
  totalTeachers: number
  attendanceRate: number
}

// ─── Teacher self-view stats ─────────────────────────────────────────────────

export type TeacherSelfStats = {
  sessionStartedOn: string | null
  totalWorkingDays: number
  presentDays: number
  absentDays: number
  lateDays: number
  attendanceRate: number
}
