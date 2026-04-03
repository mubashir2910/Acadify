import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { ZodError } from "zod"
import { submitTeacherAttendanceSchema, editTeacherAttendanceSchema } from "@/schemas/teacher-attendance.schema"
import {
  getAdminSchoolId,
  getAdminTeachers,
  submitTeacherAttendance,
  editTeacherAttendance,
} from "@/services/teacher-attendance.service"
import { writeLimiter, checkRateLimit } from "@/lib/rate-limit"

// ─── GET — Admin: fetch teachers with attendance status for a date ────

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get("date")
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json({ message: "Invalid or missing date" }, { status: 400 })
    }

    const schoolId = await getAdminSchoolId(session.user.id)
    if (!schoolId) {
      return NextResponse.json({ message: "School not found" }, { status: 404 })
    }

    const data = await getAdminTeachers(schoolId, dateStr)
    return NextResponse.json(data)
  } catch (error) {
    console.error("GET /api/teacher-attendance error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

// ─── POST — Admin: batch submit teacher attendance (current week) ─────

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const limited = await checkRateLimit(writeLimiter, `write:${session.user.id}`)
    if (limited) return limited

    const body = await request.json()
    const data = submitTeacherAttendanceSchema.parse(body)

    const schoolId = await getAdminSchoolId(session.user.id)
    if (!schoolId) {
      return NextResponse.json({ message: "School not found" }, { status: 404 })
    }

    const result = await submitTeacherAttendance(schoolId, session.user.id, data.date, data.records)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Validation error" },
        { status: 422 }
      )
    }
    if (error instanceof Error) {
      const statusMap: Record<string, number> = {
        FUTURE_DATE: 400,
        HOLIDAY_DATE: 400,
        BEFORE_SESSION_START: 400,
        EDIT_WINDOW_EXPIRED: 400,
        INVALID_TEACHERS: 400,
      }
      const messageMap: Record<string, string> = {
        EDIT_WINDOW_EXPIRED: "Attendance can only be marked within the current week",
        HOLIDAY_DATE: "This date is a school holiday",
        BEFORE_SESSION_START: "Attendance cannot be marked before the session start date",
        FUTURE_DATE: "Cannot mark attendance for a future date",
        INVALID_TEACHERS: "One or more teachers are invalid",
      }
      const status = statusMap[error.message]
      if (status) {
        return NextResponse.json(
          { message: messageMap[error.message] ?? error.message },
          { status }
        )
      }
    }
    console.error("POST /api/teacher-attendance error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

// ─── PATCH — Admin: edit single teacher attendance (any past date) ────

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const limited = await checkRateLimit(writeLimiter, `write:${session.user.id}`)
    if (limited) return limited

    const body = await request.json()
    const data = editTeacherAttendanceSchema.parse(body)

    const schoolId = await getAdminSchoolId(session.user.id)
    if (!schoolId) {
      return NextResponse.json({ message: "School not found" }, { status: 404 })
    }

    const result = await editTeacherAttendance(
      schoolId,
      session.user.id,
      data.teacherId,
      data.date,
      data.status
    )
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Validation error" },
        { status: 422 }
      )
    }
    if (error instanceof Error) {
      const statusMap: Record<string, number> = {
        FUTURE_DATE: 400,
        HOLIDAY_DATE: 400,
        BEFORE_SESSION_START: 400,
        INVALID_TEACHERS: 400,
      }
      const messageMap: Record<string, string> = {
        HOLIDAY_DATE: "This date is a school holiday",
        BEFORE_SESSION_START: "Attendance cannot be edited before the session start date",
        FUTURE_DATE: "Cannot edit attendance for a future date",
        INVALID_TEACHERS: "Teacher not found",
      }
      const status = statusMap[error.message]
      if (status) {
        return NextResponse.json(
          { message: messageMap[error.message] ?? error.message },
          { status }
        )
      }
    }
    console.error("PATCH /api/teacher-attendance error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
