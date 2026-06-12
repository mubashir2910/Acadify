import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { getAdminSchoolId } from "@/services/attendance.service"
import { setCurrentSession } from "@/services/session.service"
import { updateSessionSchema } from "@/schemas/session.schema"
import { feeWriteLimiter, checkRateLimit } from "@/lib/rate-limit"

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const limited = await checkRateLimit(feeWriteLimiter, `fee-write:${session.user.id}`)
  if (limited) return limited

  const { id } = await ctx.params
  const schoolId = await getAdminSchoolId(session.user.id)
  if (!schoolId) return NextResponse.json({ message: "No school assigned" }, { status: 403 })

  try {
    const body = await req.json()
    const data = updateSessionSchema.parse(body)
    if (data.isCurrent) {
      const updated = await setCurrentSession(schoolId, id, session.user.id)
      return NextResponse.json(updated)
    }
    return NextResponse.json({ message: "No-op" })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 422 })
    }
    if (error instanceof Error && error.message === "SESSION_NOT_FOUND") {
      return NextResponse.json({ message: "Session not found" }, { status: 404 })
    }
    return NextResponse.json({ message: "Failed to update session" }, { status: 500 })
  }
}
