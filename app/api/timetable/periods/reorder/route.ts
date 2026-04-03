import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { ZodError } from "zod"
import { reorderPeriodsSchema } from "@/schemas/timetable.schema"
import { reorderPeriods, getAdminSchoolId } from "@/services/timetable.service"
import { writeLimiter, checkRateLimit } from "@/lib/rate-limit"

// POST — Admin reorders periods
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const limited = await checkRateLimit(writeLimiter, `write:${session.user.id}`)
    if (limited) return limited

    const schoolId = await getAdminSchoolId(session.user.id)
    if (!schoolId) return NextResponse.json({ message: "School not found" }, { status: 404 })

    const body = await request.json()
    const input = reorderPeriodsSchema.parse(body)
    await reorderPeriods(schoolId, input)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation error" }, { status: 422 })
    }
    if (error instanceof Error && error.message === "PERIOD_NOT_FOUND") {
      return NextResponse.json({ message: "One or more periods not found" }, { status: 404 })
    }
    console.error("[POST /api/timetable/periods/reorder]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
