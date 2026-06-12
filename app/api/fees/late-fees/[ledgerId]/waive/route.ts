import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { getAdminSchoolId } from "@/services/attendance.service"
import { waiveMonthlyLateFee } from "@/services/fee-monthly-late-fee.service"
import { waiveLateFeeSchema } from "@/schemas/fee-ledger.schema"
import { feeWriteLimiter, checkRateLimit } from "@/lib/rate-limit"

// Note: route directory name is `[ledgerId]` for backward-compat with existing
// frontend code; the param value is treated as a StudentMonthlyLateFee.id under
// the new per-month-block late-fee model.
export async function POST(req: Request, ctx: { params: Promise<{ ledgerId: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const limited = await checkRateLimit(feeWriteLimiter, `fee-write:${session.user.id}`)
  if (limited) return limited

  const schoolId = await getAdminSchoolId(session.user.id)
  if (!schoolId) return NextResponse.json({ message: "No school assigned" }, { status: 403 })

  const { ledgerId: monthlyLateFeeId } = await ctx.params

  try {
    const body = await req.json().catch(() => ({}))
    const validated = waiveLateFeeSchema.parse(body)
    const updated = await waiveMonthlyLateFee(schoolId, session.user.id, monthlyLateFeeId, validated)
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 422 })
    }
    if (error instanceof Error && error.message === "MONTHLY_LATE_FEE_NOT_FOUND") {
      return NextResponse.json({ message: "Late fee record not found" }, { status: 404 })
    }
    if (error instanceof Error && error.message === "LATE_FEE_NOTHING_TO_WAIVE") {
      return NextResponse.json(
        { message: "Nothing left to waive on this late fee" },
        { status: 422 },
      )
    }
    return NextResponse.json({ message: "Failed to waive late fee" }, { status: 500 })
  }
}
