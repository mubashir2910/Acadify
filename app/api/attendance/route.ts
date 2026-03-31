import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { ZodError } from "zod"
import { submitAttendanceSchema, attendanceQuerySchema, adminEditAttendanceSchema } from "@/schemas/attendance.schema"
import {
  submitAttendance,
  getSchoolAttendanceSummary,
  getClassAttendance,
  getTeacherClassAttendance,
  getAdminSchoolId,
  getSchoolClassSections,
  adminEditAttendance,
} from "@/services/attendance.service"
import { prisma } from "@/lib/prisma"

// POST — Teacher submits/updates attendance
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const data = submitAttendanceSchema.parse(body)

    // Get teacher's school
    const teacher = await prisma.teacher.findFirst({
      where: { user_id: session.user.id },
      select: { school_id: true },
    })
    if (!teacher) {
      return NextResponse.json({ message: "Teacher not found" }, { status: 404 })
    }

    const result = await submitAttendance(
      teacher.school_id,
      session.user.id,
      data.date,
      data.records
    )

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Validation error" },
        { status: 422 }
      )
    }
    if (error instanceof Error) {
      const messageMap: Record<string, string> = {
        EDIT_WINDOW_EXPIRED: "Attendance can only be edited within the current week",
        HOLIDAY_DATE: "This date is a school holiday",
      }
      const statusMap: Record<string, number> = {
        NOT_CLASS_TEACHER: 403,
        FUTURE_DATE: 400,
        WEEKEND_DATE: 400,
        HOLIDAY_DATE: 400,
        BEFORE_SESSION_START: 400,
        INVALID_STUDENTS: 400,
        EDIT_WINDOW_EXPIRED: 400,
      }
      const status = statusMap[error.message]
      if (status) {
        const message = messageMap[error.message] ?? error.message
        return NextResponse.json({ message }, { status })
      }
    }
    console.error("POST /api/attendance error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

// GET — Multi-role attendance data for a date
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = attendanceQuerySchema.parse({
      date: searchParams.get("date") ?? "",
      class: searchParams.get("class") ?? undefined,
      section: searchParams.get("section") ?? undefined,
    })

    const role = session.user.role

    // ADMIN: school-wide summary or specific class detail
    if (role === "ADMIN") {
      const schoolId = await getAdminSchoolId(session.user.id)
      if (!schoolId) {
        return NextResponse.json({ message: "School not found" }, { status: 404 })
      }

      if (query.class && query.section) {
        const result = await getClassAttendance(schoolId, query.class, query.section, query.date)
        return NextResponse.json({ date: query.date, class: query.class, section: query.section, ...result })
      }

      const result = await getSchoolAttendanceSummary(schoolId, query.date)
      const classSections = await getSchoolClassSections(schoolId)
      return NextResponse.json({ date: query.date, ...result, classSections })
    }

    // TEACHER: auto-scoped to assigned class
    if (role === "TEACHER") {
      const result = await getTeacherClassAttendance(session.user.id, query.date)
      return NextResponse.json(result)
    }

    // STUDENT: own attendance for the date
    if (role === "STUDENT") {
      const student = await prisma.student.findFirst({
        where: { user_id: session.user.id, status: "ACTIVE" },
        select: { id: true },
      })
      if (!student) {
        return NextResponse.json({ message: "Student not found" }, { status: 404 })
      }
      const date = new Date(query.date + "T00:00:00.000Z")
      const record = await prisma.attendance.findFirst({
        where: { student_id: student.id, date },
        select: { status: true },
      })
      return NextResponse.json({ date: query.date, status: record?.status ?? null })
    }

    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Validation error" },
        { status: 422 }
      )
    }
    console.error("GET /api/attendance error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

// PATCH — Admin edits single student's attendance
export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const data = adminEditAttendanceSchema.parse(body)

    const schoolId = await getAdminSchoolId(session.user.id)
    if (!schoolId) {
      return NextResponse.json({ message: "School not found" }, { status: 404 })
    }

    const result = await adminEditAttendance(
      schoolId,
      session.user.id,
      data.studentId,
      data.date,
      data.status
    )

    return NextResponse.json(result, { status: 200 })
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
        WEEKEND_DATE: 400,
        HOLIDAY_DATE: 400,
        INVALID_STUDENTS: 400,
        BEFORE_SESSION_START: 400,
      }
      const messageMap2: Record<string, string> = {
        HOLIDAY_DATE: "This date is a school holiday",
        BEFORE_SESSION_START: "Attendance cannot be edited before the session start date",
      }
      const status = statusMap[error.message]
      if (status) {
        const message = messageMap2[error.message] ?? error.message
        return NextResponse.json({ message }, { status })
      }
    }
    console.error("PATCH /api/attendance error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
