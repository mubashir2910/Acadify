import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { ZodError } from "zod"
import {
  calendarOverrideSchema,
  calendarQuerySchema,
  calendarDeleteSchema,
} from "@/schemas/calendar.schema"
import {
  getMonthOverrides,
  upsertDayOverride,
  removeDayOverride,
} from "@/services/calendar.service"
import { getAdminSchoolId, getStudentSchoolId } from "@/services/attendance.service"
import { getTeacherSchoolId } from "@/services/calendar.service"
import { writeLimiter, checkRateLimit } from "@/lib/rate-limit"

// ─── Helper: resolve school ID from session ─────────────────────────

async function resolveSchoolId(
  userId: string,
  role: string
): Promise<string | null> {
  if (role === "ADMIN") return getAdminSchoolId(userId)
  if (role === "TEACHER") return getTeacherSchoolId(userId)
  if (role === "STUDENT") return getStudentSchoolId(userId)
  return null
}

// GET — Fetch overrides for a month (all authenticated roles)
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = calendarQuerySchema.parse({
      month: searchParams.get("month"),
    })

    const schoolId = await resolveSchoolId(session.user.id, session.user.role)
    if (!schoolId) {
      return NextResponse.json({ message: "School not found" }, { status: 404 })
    }

    const [yearStr, monthStr] = query.month.split("-")
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)

    const overrides = await getMonthOverrides(schoolId, year, month)

    return NextResponse.json({ month: query.month, overrides })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Validation error" },
        { status: 422 }
      )
    }
    console.error("GET /api/calendar error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST — Create/update a day override (ADMIN only)
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const limited = await checkRateLimit(writeLimiter, `write:${session.user.id}`)
    if (limited) return limited

    const body = await request.json()
    const data = calendarOverrideSchema.parse(body)

    const schoolId = await getAdminSchoolId(session.user.id)
    if (!schoolId) {
      return NextResponse.json({ message: "School not found" }, { status: 404 })
    }

    const result = await upsertDayOverride(
      schoolId,
      session.user.id,
      data.date,
      data.type,
      data.reason
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
        ALREADY_WORKING_DAY: 400,
        ALREADY_HOLIDAY: 400,
      }
      const messageMap: Record<string, string> = {
        ALREADY_WORKING_DAY: "This day is already a working day by default",
        ALREADY_HOLIDAY: "This day is already a holiday by default",
      }
      const status = statusMap[error.message]
      if (status) {
        return NextResponse.json(
          { message: messageMap[error.message] ?? error.message },
          { status }
        )
      }
    }
    console.error("POST /api/calendar error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE — Remove a day override (ADMIN only)
export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const limited = await checkRateLimit(writeLimiter, `write:${session.user.id}`)
    if (limited) return limited

    const body = await request.json()
    const data = calendarDeleteSchema.parse(body)

    const schoolId = await getAdminSchoolId(session.user.id)
    if (!schoolId) {
      return NextResponse.json({ message: "School not found" }, { status: 404 })
    }

    const result = await removeDayOverride(schoolId, data.date)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Validation error" },
        { status: 422 }
      )
    }
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json(
        { message: "No override found for this date" },
        { status: 404 }
      )
    }
    console.error("DELETE /api/calendar error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
