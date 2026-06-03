import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { ZodError } from "zod"
import { createPeriodSchema } from "@/schemas/timetable.schema"
import {
  createPeriod,
  getAdminSchoolId,
  getPeriodsForGroup,
} from "@/services/timetable.service"
import { writeLimiter, checkRateLimit } from "@/lib/rate-limit"

// GET — Admin fetches period structure for a specific group
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const schoolId = await getAdminSchoolId(session.user.id)
    if (!schoolId) return NextResponse.json({ message: "School not found" }, { status: 404 })

    const url = new URL(request.url)
    const groupId = url.searchParams.get("groupId")
    if (!groupId) {
      return NextResponse.json({ message: "groupId query parameter required" }, { status: 400 })
    }

    const periods = await getPeriodsForGroup(schoolId, groupId)
    return NextResponse.json(periods)
  } catch (error) {
    if (error instanceof Error && error.message === "GROUP_NOT_FOUND") {
      return NextResponse.json({ message: "Timetable group not found" }, { status: 404 })
    }
    console.error("[GET /api/timetable/periods]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

// POST — Admin creates a period for a specific group
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
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Validation error" },
        { status: 422 },
      )
    }
    if (error instanceof Error && error.message === "GROUP_NOT_FOUND") {
      return NextResponse.json({ message: "Timetable group not found" }, { status: 404 })
    }
    console.error("[POST /api/timetable/periods]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
