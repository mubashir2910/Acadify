import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { getAdminSchoolId } from "@/services/attendance.service"
import { accrueMonthlyLateFees } from "@/services/fee-monthly-late-fee.service"
import { accrueLateFeesSchema } from "@/schemas/fee-ledger.schema"
import { feeWriteLimiter, checkRateLimit } from "@/lib/rate-limit"

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
    const body = await req.json().catch(() => ({}))
    const validated = accrueLateFeesSchema.parse(body)
    const result = await accrueMonthlyLateFees(schoolId, {
      sessionId: validated.sessionId,
      class: validated.class,
      section: validated.section,
      actorUserId: session.user.id,
    })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 422 })
    }
    console.error("[POST /api/fees/late-fees/accrue]", error)
    return NextResponse.json({ message: "Failed to accrue late fees" }, { status: 500 })
  }
}
