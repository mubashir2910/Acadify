import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { ZodError } from "zod"
import { updatePeriodSchema } from "@/schemas/timetable.schema"
import { updatePeriod, deletePeriod, getAdminSchoolId } from "@/services/timetable.service"
import { writeLimiter, checkRateLimit } from "@/lib/rate-limit"

// PATCH — Admin updates a period
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const limited = await checkRateLimit(writeLimiter, `write:${session.user.id}`)
    if (limited) return limited

    const { id } = await params
    const schoolId = await getAdminSchoolId(session.user.id)
    if (!schoolId) return NextResponse.json({ message: "School not found" }, { status: 404 })

    const body = await request.json()
    const input = updatePeriodSchema.parse(body)

    // end_time > start_time check when both provided
    if (input.start_time && input.end_time && input.end_time <= input.start_time) {
      return NextResponse.json({ message: "End time must be after start time" }, { status: 422 })
    }

    const period = await updatePeriod(schoolId, id, input)
    return NextResponse.json(period)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation error" }, { status: 422 })
    }
    if (error instanceof Error) {
      const errorMap: Record<string, [string, number]> = {
        PERIOD_NOT_FOUND:       ["Period not found", 404],
        PERIOD_HAS_ASSIGNMENTS: ["Cannot modify period with existing timetable assignments", 409],
      }
      const entry = errorMap[error.message]
      if (entry) return NextResponse.json({ message: entry[0] }, { status: entry[1] })
    }
    console.error("[PATCH /api/timetable/periods/:id]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

// DELETE — Admin deletes a period
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const limited = await checkRateLimit(writeLimiter, `write:${session.user.id}`)
    if (limited) return limited

    const { id } = await params
    const schoolId = await getAdminSchoolId(session.user.id)
    if (!schoolId) return NextResponse.json({ message: "School not found" }, { status: 404 })

    await deletePeriod(schoolId, id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof Error) {
      const errorMap: Record<string, [string, number]> = {
        PERIOD_NOT_FOUND:       ["Period not found", 404],
        PERIOD_HAS_ASSIGNMENTS: ["Cannot delete period with existing timetable assignments — remove assignments first", 409],
      }
      const entry = errorMap[error.message]
      if (entry) return NextResponse.json({ message: entry[0] }, { status: entry[1] })
    }
    console.error("[DELETE /api/timetable/periods/:id]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
