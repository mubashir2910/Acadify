import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { giveAttendanceAccessSchema } from "@/schemas/attendance-access.schema"
import {
  getAdminSchoolId,
  getAttendanceAccessGrants,
  giveAttendanceAccess,
} from "@/services/attendance-access.service"
import { writeLimiter, checkRateLimit } from "@/lib/rate-limit"

const ERROR_STATUS: Record<string, number> = {
  TEACHER_NOT_FOUND:        404,
  TEACHER_IS_CLASS_TEACHER: 409,
  CLASS_SECTION_NOT_FOUND:  404,
  OVERLAPPING_ACCESS:       409,
  NO_SCHOOL:                403,
}

const ERROR_MESSAGE: Record<string, string> = {
  TEACHER_IS_CLASS_TEACHER: "This teacher is already a class teacher and cannot be given temporary access.",
  OVERLAPPING_ACCESS:       "This teacher already has attendance access during the selected date range.",
  CLASS_SECTION_NOT_FOUND:  "Selected class-section has no active students.",
}

async function getSchoolIdOrFail(userId: string) {
  const schoolId = await getAdminSchoolId(userId)
  if (!schoolId) throw new Error("NO_SCHOOL")
  return schoolId
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const schoolId = await getSchoolIdOrFail(session.user.id)
    const grants = await getAttendanceAccessGrants(schoolId)
    return NextResponse.json(grants)
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    console.error("[GET /api/attendance-access]", error)
    const status = ERROR_STATUS[msg] ?? 500
    return NextResponse.json({ message: ERROR_MESSAGE[msg] ?? msg }, { status })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const limited = await checkRateLimit(writeLimiter, `write:${session.user.id}`)
  if (limited) return limited

  try {
    const body = await request.json()
    const data = giveAttendanceAccessSchema.parse(body)
    const schoolId = await getSchoolIdOrFail(session.user.id)
    await giveAttendanceAccess(schoolId, session.user.id, data)
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 422 })
    }
    const msg = error instanceof Error ? error.message : "Unknown error"
    console.error("[POST /api/attendance-access]", error)
    const status = ERROR_STATUS[msg] ?? 500
    return NextResponse.json({ message: ERROR_MESSAGE[msg] ?? msg }, { status })
  }
}
