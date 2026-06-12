import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { resolveSchoolForAdminAccess } from "@/lib/school-access"
import { updateUpiAccountSchema } from "@/schemas/school-upi-account.schema"
import {
  deleteUpiAccount,
  updateUpiAccount,
} from "@/services/school-upi-account.service"
import { feeWriteLimiter, checkRateLimit } from "@/lib/rate-limit"

interface RouteParams {
  params: Promise<{ schoolCode: string; id: string }>
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  const { schoolCode, id } = await params
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
    const parsed = updateUpiAccountSchema.parse(body)
    const updated = await updateUpiAccount(access.schoolId, session.user.id, id, parsed)
    return NextResponse.json({ item: updated })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Invalid input" }, { status: 422 })
    }
    if (error instanceof Error && error.message === "UPI_ACCOUNT_NOT_FOUND") {
      return NextResponse.json({ message: "UPI account not found" }, { status: 404 })
    }
    console.error("[PATCH upi-accounts]", error)
    return NextResponse.json({ message: "Failed to update UPI account" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  const { schoolCode, id } = await params
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
    await deleteUpiAccount(access.schoolId, session.user.id, id)
    return NextResponse.json({ message: "Deleted" })
  } catch (error) {
    if (error instanceof Error && error.message === "UPI_ACCOUNT_NOT_FOUND") {
      return NextResponse.json({ message: "UPI account not found" }, { status: 404 })
    }
    console.error("[DELETE upi-accounts]", error)
    return NextResponse.json({ message: "Failed to delete UPI account" }, { status: 500 })
  }
}
