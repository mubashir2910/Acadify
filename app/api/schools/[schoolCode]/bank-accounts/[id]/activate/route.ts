import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { resolveSchoolForAdminAccess } from "@/lib/school-access"
import { setActiveBankAccount } from "@/services/school-bank-account.service"
import { feeWriteLimiter, checkRateLimit } from "@/lib/rate-limit"

interface RouteParams {
  params: Promise<{ schoolCode: string; id: string }>
}

export async function POST(_req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const { schoolCode, id } = await params
  const access = await resolveSchoolForAdminAccess(schoolCode, session.user)
  if ("error" in access) {
    return NextResponse.json(
      { message: access.error === "NOT_FOUND" ? "School not found" : "Forbidden" },
      { status: access.error === "NOT_FOUND" ? 404 : 403 },
    )
  }
  const limited = await checkRateLimit(feeWriteLimiter, `bank-write:${session.user.id}`)
  if (limited) return limited
  try {
    const updated = await setActiveBankAccount(access.schoolId, session.user.id, id)
    return NextResponse.json({ item: updated })
  } catch (error) {
    if (error instanceof Error && error.message === "BANK_ACCOUNT_NOT_FOUND") {
      return NextResponse.json({ message: "Bank account not found" }, { status: 404 })
    }
    console.error("[POST bank-accounts/activate]", error)
    return NextResponse.json({ message: "Failed to activate" }, { status: 500 })
  }
}
