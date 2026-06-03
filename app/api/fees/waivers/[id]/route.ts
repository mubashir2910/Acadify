import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { getAdminSchoolId } from "@/services/attendance.service"
import { revokeWaiver } from "@/services/fee-waiver.service"
import { revokeFeeWaiverSchema } from "@/schemas/fee-waiver.schema"
import { feeWriteLimiter, checkRateLimit } from "@/lib/rate-limit"

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const limited = await checkRateLimit(feeWriteLimiter, `fee-write:${session.user.id}`)
  if (limited) return limited

  const schoolId = await getAdminSchoolId(session.user.id)
  if (!schoolId) return NextResponse.json({ message: "No school assigned" }, { status: 403 })

  const { id } = await ctx.params

  try {
    const body = await req.json().catch(() => ({}))
    const validated = revokeFeeWaiverSchema.parse(body)
    const updated = await revokeWaiver(schoolId, session.user.id, id, validated)
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 422 })
    }
    if (error instanceof Error) {
      if (error.message === "WAIVER_NOT_FOUND")
        return NextResponse.json({ message: "Waiver not found" }, { status: 404 })
      if (error.message === "WAIVER_ALREADY_REVOKED")
        return NextResponse.json({ message: "Already revoked" }, { status: 409 })
    }
    return NextResponse.json({ message: "Failed to revoke" }, { status: 500 })
  }
}
