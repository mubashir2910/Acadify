import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { resolveSchoolForAdminAccess } from "@/lib/school-access"
import { updateQrCodeSchema } from "@/schemas/school-qr-code.schema"
import { deleteQrCode, updateQrCode } from "@/services/school-qr-code.service"
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
  const limited = await checkRateLimit(feeWriteLimiter, `qr-write:${session.user.id}`)
  if (limited) return limited
  try {
    const body = await req.json()
    const parsed = updateQrCodeSchema.parse(body)
    const updated = await updateQrCode(access.schoolId, session.user.id, id, parsed)
    return NextResponse.json({ item: updated })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Invalid input" }, { status: 422 })
    }
    if (error instanceof Error && (error.message === "QR_CODE_NOT_FOUND" || error.message === "BANK_ACCOUNT_NOT_FOUND")) {
      return NextResponse.json({ message: error.message === "QR_CODE_NOT_FOUND" ? "QR code not found" : "Linked bank account not found" }, { status: error.message === "QR_CODE_NOT_FOUND" ? 404 : 422 })
    }
    console.error("[PATCH qr-codes]", error)
    return NextResponse.json({ message: "Failed to update QR code" }, { status: 500 })
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
  const limited = await checkRateLimit(feeWriteLimiter, `qr-write:${session.user.id}`)
  if (limited) return limited
  try {
    await deleteQrCode(access.schoolId, session.user.id, id)
    return NextResponse.json({ message: "Deleted" })
  } catch (error) {
    if (error instanceof Error && error.message === "QR_CODE_NOT_FOUND") {
      return NextResponse.json({ message: "QR code not found" }, { status: 404 })
    }
    console.error("[DELETE qr-codes]", error)
    return NextResponse.json({ message: "Failed to delete QR code" }, { status: 500 })
  }
}
