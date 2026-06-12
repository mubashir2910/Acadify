import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { getAdminSchoolId } from "@/services/attendance.service"
import { verifyTransaction } from "@/services/fee-transaction.service"
import { verifyTransactionSchema } from "@/schemas/fee-transaction.schema"
import { feeVerifyLimiter, checkRateLimit } from "@/lib/rate-limit"

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const limited = await checkRateLimit(feeVerifyLimiter, `fee-verify:${session.user.id}`)
  if (limited) return limited

  const schoolId = await getAdminSchoolId(session.user.id)
  if (!schoolId) return NextResponse.json({ message: "No school assigned" }, { status: 403 })

  const { id } = await ctx.params

  try {
    const body = await req.json().catch(() => ({}))
    const validated = verifyTransactionSchema.parse(body)
    const updated = await verifyTransaction(schoolId, session.user.id, id, validated.notes)
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 422 })
    }
    if (error instanceof Error) {
      if (error.message === "TRANSACTION_NOT_FOUND")
        return NextResponse.json({ message: "Transaction not found" }, { status: 404 })
      if (error.message === "ALREADY_PROCESSED")
        return NextResponse.json(
          { message: "This transaction has already been processed" },
          { status: 409 },
        )
    }
    console.error("[POST /api/fees/transactions/[id]/verify]", error)
    return NextResponse.json({ message: "Failed to verify" }, { status: 500 })
  }
}
