import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { resolveSchoolForAdminAccess } from "@/lib/school-access"
import { createQrCodeSchema } from "@/schemas/school-qr-code.schema"
import { createQrCode, listQrCodes } from "@/services/school-qr-code.service"
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
  const items = await listQrCodes(access.schoolId)
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
  const limited = await checkRateLimit(feeWriteLimiter, `qr-write:${session.user.id}`)
  if (limited) return limited
  try {
    const body = await req.json()
    const parsed = createQrCodeSchema.parse(body)
    const created = await createQrCode(access.schoolId, session.user.id, parsed)
    return NextResponse.json({ item: created })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Invalid input" }, { status: 422 })
    }
    if (error instanceof Error && error.message === "QR_CODE_LIMIT_REACHED") {
      return NextResponse.json({ message: "Maximum 5 QR codes per school" }, { status: 422 })
    }
    if (error instanceof Error && error.message === "BANK_ACCOUNT_NOT_FOUND") {
      return NextResponse.json({ message: "Linked bank account not found" }, { status: 422 })
    }
    console.error("[POST qr-codes]", error)
    return NextResponse.json({ message: "Failed to create QR code" }, { status: 500 })
  }
}
