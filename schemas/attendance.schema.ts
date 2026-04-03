import { z } from "zod"

// ─── Status enum ───────────────────────────────────────────────────
export const attendanceStatusEnum = z.enum(["PRESENT", "ABSENT", "LATE"])
export type AttendanceStatus = z.infer<typeof attendanceStatusEnum>

// ─── Submit attendance (teacher POST body) ─────────────────────────
export const submitAttendanceSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  records: z
    .array(
      z.object({
        studentId: z.string().uuid("Invalid student ID"),
        status: attendanceStatusEnum,
      })
    )
    .min(1, "At least one attendance record is required"),
})
export type SubmitAttendanceInput = z.infer<typeof submitAttendanceSchema>

// ─── Query params for GET /api/attendance ───────────────────────────
export const attendanceQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  class: z.string().optional(),
  section: z.string().optional(),
})
export type AttendanceQueryInput = z.infer<typeof attendanceQuerySchema>

// ─── Query params for GET /api/attendance/student-monthly ───────────
export const studentMonthlyQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
})
export type StudentMonthlyQueryInput = z.infer<typeof studentMonthlyQuerySchema>

// ─── Session start date (super admin) ───────────────────────────────
export const updateSessionStartSchema = z.object({
  session_started_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
})
export type UpdateSessionStartInput = z.infer<typeof updateSessionStartSchema>

// ─── Admin edit single student attendance ───────────────────────────
export const adminEditAttendanceSchema = z.object({
  studentId: z.string().uuid("Invalid student ID"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  status: attendanceStatusEnum,
})
export type AdminEditAttendanceInput = z.infer<typeof adminEditAttendanceSchema>

// ─── Response types ─────────────────────────────────────────────────
export interface AttendanceSummaryStats {
  totalPresent: number
  totalAbsent: number
  totalLate: number
  totalStudents: number
  attendanceRate: number
}

export interface ClassAttendanceSummary {
  class: string
  section: string
  className: string
  classTeacher: string | null
  totalStudents: number
  totalPresent: number
  totalAbsent: number
  totalLate: number
  attendanceRate: number
}

export interface StudentAttendanceRecord {
  studentId: string
  name: string
  rollNo: string
  profilePicture: string | null
  status: AttendanceStatus | null
  lastEditedAt: string | null
  lastEditedBy: string | null
}

export interface StudentAttendanceStats {
  sessionStartedOn: string | null
  totalWorkingDays: number
  presentDays: number
  absentDays: number
  lateDays: number
  attendanceRate: number
}

export interface ClassStudentStat {
  studentId: string
  name: string
  rollNo: string
  profilePicture: string | null
  totalPresent: number
  totalAbsent: number
  totalLate: number
  attendanceRate: number
}
