import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { ZodError } from "zod"
import { createPeriodSchema } from "@/schemas/timetable.schema"
import { getPeriodsForSchool, createPeriod, getAdminSchoolId } from "@/services/timetable.service"
import { writeLimiter, checkRateLimit } from "@/lib/rate-limit"

// GET — Admin fetches period structure
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const schoolId = await getAdminSchoolId(session.user.id)
    if (!schoolId) return NextResponse.json({ message: "School not found" }, { status: 404 })

    const periods = await getPeriodsForSchool(schoolId)
    return NextResponse.json(periods)
  } catch (error) {
    console.error("[GET /api/timetable/periods]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

// POST — Admin creates a period
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
    const input = createPeriodSchema.parse(body)
    const period = await createPeriod(schoolId, input)
    return NextResponse.json(period, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation error" }, { status: 422 })
    }
    console.error("[POST /api/timetable/periods]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
