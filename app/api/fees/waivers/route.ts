import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { getAdminSchoolId } from "@/services/attendance.service"
import { getStudentWaivers, grantWaiver } from "@/services/fee-waiver.service"
import { createFeeWaiverSchema } from "@/schemas/fee-waiver.schema"
import { feeWriteLimiter, expensiveReadLimiter, checkRateLimit } from "@/lib/rate-limit"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const limited = await checkRateLimit(expensiveReadLimiter, `read:${session.user.id}`)
  if (limited) return limited

  const schoolId = await getAdminSchoolId(session.user.id)
  if (!schoolId) return NextResponse.json({ message: "No school assigned" }, { status: 403 })

  const url = new URL(req.url)
  const studentId = url.searchParams.get("studentId")
  const sessionId = url.searchParams.get("sessionId") ?? undefined

  if (!studentId) return NextResponse.json({ message: "studentId is required" }, { status: 400 })

  const waivers = await getStudentWaivers(schoolId, studentId, sessionId)
  return NextResponse.json(waivers)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const limited = await checkRateLimit(feeWriteLimiter, `fee-write:${session.user.id}`)
  if (limited) return limited

  const schoolId = await getAdminSchoolId(session.user.id)
  if (!schoolId) return NextResponse.json({ message: "No school assigned" }, { status: 403 })

  try {
    const body = await req.json()
    const validated = createFeeWaiverSchema.parse(body)
    const created = await grantWaiver(schoolId, session.user.id, validated)
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 422 })
    }
    if (error instanceof Error) {
      if (error.message === "STUDENT_NOT_FOUND")
        return NextResponse.json({ message: "Student not found" }, { status: 404 })
      if (error.message === "FEE_HEAD_NOT_FOUND")
        return NextResponse.json({ message: "Fee head not found" }, { status: 404 })
      if (error.message === "SESSION_NOT_FOUND")
        return NextResponse.json({ message: "Session not found" }, { status: 404 })
      if (error.message === "WAIVER_LEDGER_NOT_FOUND")
        return NextResponse.json(
          { message: "No fee was found for that student, fee head and month" },
          { status: 404 },
        )
      if (error.message === "WAIVER_ALREADY_EXISTS")
        return NextResponse.json(
          { message: "A waiver already exists for this fee head and month" },
          { status: 409 },
        )
      if (error.message === "WAIVER_LIMIT_REACHED")
        return NextResponse.json(
          {
            message:
              "Maximum 10 active waivers per fee head/month. Revoke an older waiver before granting a new one.",
          },
          { status: 409 },
        )
    }
    console.error("[POST /api/fees/waivers]", error)
    return NextResponse.json({ message: "Failed to create waiver" }, { status: 500 })
  }
}
