import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { ZodError } from "zod"
import { createClassLogSchema, classLogQuerySchema } from "@/schemas/class-log.schema"
import {
  getTeacherLogDashboard,
  getTeacherLogHistory,
  createClassLog,
  getStudentClassLogs,
  getAdminClassLogs,
  getAdminMissingLogs,
  getAdminSchoolId,
} from "@/services/class-log.service"
import { prisma } from "@/lib/prisma"
import { writeLimiter, checkRateLimit } from "@/lib/rate-limit"
import { getTodayISTString } from "@/lib/working-days"

// GET — multi-role
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = classLogQuerySchema.parse(Object.fromEntries(searchParams))

    const role = session.user.role
    const userId = session.user.id

    if (role === "TEACHER") {
      const isMissing = query.missing === "true"
      if (isMissing) {
        // Teacher asking for "history" view
        const logs = await getTeacherLogHistory(userId, query.from, query.to)
        return NextResponse.json(logs)
      }
      // Default: today's dashboard
      const date = query.date ?? getTodayISTString()
      const slots = await getTeacherLogDashboard(userId, date)
      return NextResponse.json(slots)
    }

    if (role === "STUDENT") {
      const logs = await getStudentClassLogs(userId, query.from, query.to)
      return NextResponse.json(logs)
    }

    if (role === "ADMIN") {
      // Admin's own teaching dashboard (same as teacher)
      if (query.view === "dashboard") {
        const date = query.date ?? getTodayISTString()
        const slots = await getTeacherLogDashboard(userId, date)
        return NextResponse.json(slots)
      }

      // Admin's own teaching history (same as teacher)
      if (query.view === "history") {
        const logs = await getTeacherLogHistory(userId, query.from, query.to)
        return NextResponse.json(logs)
      }

      // Tracking view: school-wide monitoring
      const schoolId = await getAdminSchoolId(userId)
      if (!schoolId) {
        return NextResponse.json({ message: "School not found" }, { status: 404 })
      }

      if (query.missing === "true") {
        const date = query.date ?? getTodayISTString()
        const missing = await getAdminMissingLogs(schoolId, date)
        return NextResponse.json(missing)
      }

      const logs = await getAdminClassLogs(schoolId, {
        class: query.class,
        section: query.section,
        from: query.from,
        to: query.to,
      })
      return NextResponse.json(logs)
    }

    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 422 })
    }
    console.error("[GET /api/class-log]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

// POST — Teacher or Admin (with Teacher record) creates a log
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const role = session.user.role
    if (role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const limited = await checkRateLimit(writeLimiter, `write:${session.user.id}`)
    if (limited) return limited

    const body = await request.json()
    const data = createClassLogSchema.parse(body)

    // Resolve schoolId based on role
    let schoolId: string | null = null
    if (role === "TEACHER") {
      const teacher = await prisma.teacher.findFirst({
        where: { user_id: session.user.id, status: "ACTIVE" },
        select: { school_id: true },
      })
      schoolId = teacher?.school_id ?? null
    } else {
      schoolId = await getAdminSchoolId(session.user.id)
    }

    if (!schoolId) {
      return NextResponse.json({ message: "School not found" }, { status: 404 })
    }

    const log = await createClassLog(schoolId, session.user.id, data)
    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 422 })
    }
    if (error instanceof Error) {
      const mapped: Record<string, { status: number; message: string }> = {
        TEACHER_NOT_FOUND: { status: 404, message: "Teacher record not found" },
        TIMETABLE_NOT_FOUND: { status: 404, message: "Timetable slot not found or not assigned to you" },
        FUTURE_DATE: { status: 400, message: "Cannot log for a future date" },
        BACKDATE_LIMIT_EXCEEDED: { status: 400, message: "Cannot log more than 3 days back" },
        DAY_MISMATCH: { status: 400, message: "Date does not match the scheduled day for this slot" },
      }
      const mapped_error = mapped[error.message]
      if (mapped_error) {
        return NextResponse.json({ message: mapped_error.message }, { status: mapped_error.status })
      }
    }
    console.error("[POST /api/class-log]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
