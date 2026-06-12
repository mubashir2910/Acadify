import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { resolveSchoolForAdminAccess } from "@/lib/school-access"
import { createUpiAccountSchema } from "@/schemas/school-upi-account.schema"
import {
  createUpiAccount,
  listUpiAccounts,
} from "@/services/school-upi-account.service"
import { feeWriteLimiter, expensiveReadLimiter, checkRateLimit } from "@/lib/rate-limit"

interface RouteParams {
  params: Promise<{ schoolCode: string }>
}

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  const { schoolCode } = await params
  const access = await resolveSchoolForAdminAccess(schoolCode, session.user)
  if ("error" in access) {
    return NextResponse.json(
      { message: access.error === "NOT_FOUND" ? "School not found" : "Forbidden" },
      { status: access.error === "NOT_FOUND" ? 404 : 403 },
    )
  }
  const limited = await checkRateLimit(expensiveReadLimiter, `read:${session.user.id}`)
  if (limited) return limited
  const items = await listUpiAccounts(access.schoolId)
  return NextResponse.json({ items })
}

export async function POST(req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  const { schoolCode } = await params
  const access = await resolveSchoolForAdminAccess(schoolCode, session.user)
  if ("error" in access) {
    return NextResponse.json(
      { message: access.error === "NOT_FOUND" ? "School not found" : "Forbidden" },
      { status: access.error === "NOT_FOUND" ? 404 : 403 },
    )
  }
  const limited = await checkRateLimit(feeWriteLimiter, `upi-write:${session.user.id}`)
  if (limited) return limited
  try {
    const body = await req.json()
    const parsed = createUpiAccountSchema.parse(body)
    const created = await createUpiAccount(access.schoolId, session.user.id, parsed)
    return NextResponse.json({ item: created })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Invalid input" }, { status: 422 })
    }
    if (error instanceof Error && error.message === "UPI_ACCOUNT_LIMIT_REACHED") {
      return NextResponse.json({ message: "Maximum 5 UPI accounts per school" }, { status: 422 })
    }
    console.error("[POST upi-accounts]", error)
    return NextResponse.json({ message: "Failed to create UPI account" }, { status: 500 })
  }
}
