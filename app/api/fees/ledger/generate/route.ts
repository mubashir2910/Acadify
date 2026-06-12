import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { getAdminSchoolId } from "@/services/attendance.service"
import { generateLedgerForSession } from "@/services/fee-ledger.service"
import { generateLedgerSchema } from "@/schemas/fee-ledger.schema"
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
    const body = await req.json()
    const validated = generateLedgerSchema.parse(body)
    const result = await generateLedgerForSession(schoolId, session.user.id, validated)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 422 })
    }
    if (error instanceof Error && error.message === "SESSION_NOT_FOUND") {
      return NextResponse.json({ message: "Session not found" }, { status: 404 })
    }
    console.error("[POST /api/fees/ledger/generate]", error)
    return NextResponse.json({ message: "Failed to generate ledger" }, { status: 500 })
  }
}
