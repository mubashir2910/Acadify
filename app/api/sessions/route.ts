import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { getAdminSchoolId } from "@/services/attendance.service"
import { createSession, listSessions } from "@/services/session.service"
import { createSessionSchema } from "@/schemas/session.schema"
import { feeWriteLimiter, expensiveReadLimiter, checkRateLimit } from "@/lib/rate-limit"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const limited = await checkRateLimit(expensiveReadLimiter, `read:${session.user.id}`)
  if (limited) return limited

  const schoolId = await getAdminSchoolId(session.user.id)
  if (!schoolId) return NextResponse.json({ message: "No school assigned" }, { status: 403 })

  try {
    const sessions = await listSessions(schoolId)
    return NextResponse.json(sessions)
  } catch {
    return NextResponse.json({ message: "Failed to fetch sessions" }, { status: 500 })
  }
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
    const validated = createSessionSchema.parse(body)
    const created = await createSession(schoolId, session.user.id, validated)
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 422 })
    }
    if (error instanceof Error && error.message === "SESSION_NAME_EXISTS") {
      return NextResponse.json({ message: "Session name already exists" }, { status: 409 })
    }
    if (error instanceof Error && error.message === "INVALID_DATE") {
      return NextResponse.json({ message: "Invalid date format" }, { status: 422 })
    }
    console.error("[POST /api/sessions]", error)
    return NextResponse.json({ message: "Failed to create session" }, { status: 500 })
  }
}
