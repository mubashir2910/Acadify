import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import {
  getAdminSchoolId,
  getStudentSchoolId,
} from "@/services/attendance.service"
import { buildReceiptPdf, loadReceiptData } from "@/services/fee-receipt.service"
import { feeExportLimiter, checkRateLimit } from "@/lib/rate-limit"

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  // L3: rate-limit receipt PDF generation. pdf-lib uses 50-100ms of CPU
  // per call; without a ceiling a misbehaving client (or a script
  // hammering the receipt URL) burns through worker capacity and starves
  // other admins. Reuses the export limiter — both are CPU-bound PDF/CSV
  // builds.
  const limited = await checkRateLimit(feeExportLimiter, `receipt:${session.user.id}`)
  if (limited) return limited

  const role = session.user.role ?? ""

  let schoolId: string | null = null
  if (role === "ADMIN") schoolId = await getAdminSchoolId(session.user.id)
  else if (role === "STUDENT") schoolId = await getStudentSchoolId(session.user.id)
  if (!schoolId) return NextResponse.json({ message: "No school assigned" }, { status: 403 })

  const { id } = await ctx.params

  try {
    const data = await loadReceiptData(schoolId, id)
    if (data.status !== "VERIFIED") {
      return NextResponse.json(
        { message: "Receipt is only available for verified transactions" },
        { status: 400 },
      )
    }

    if (role === "STUDENT") {
      const student = await prisma.student.findFirst({
        where: { user_id: session.user.id, school_id: schoolId },
        select: { id: true },
      })
      if (!student || data.student_id !== student.id)
        return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const pdf = await buildReceiptPdf(data)
    return NextResponse.json({
      pdf,
      filename: `${data.receipt_no.replace(/\//g, "_")}.pdf`,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "TRANSACTION_NOT_FOUND") {
      return NextResponse.json({ message: "Transaction not found" }, { status: 404 })
    }
    console.error("[GET /api/fees/transactions/[id]/receipt]", error)
    return NextResponse.json({ message: "Failed to build receipt" }, { status: 500 })
  }
}
