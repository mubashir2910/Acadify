import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getAdminSchoolId, getStudentSchoolId } from "@/services/attendance.service"
import {
  listSchoolTransactions,
  recordManualPayment,
  submitHybridProof,
} from "@/services/fee-transaction.service"
import {
  hybridUploadSchema,
  manualPaymentSchema,
  transactionQuerySchema,
} from "@/schemas/fee-transaction.schema"
import { feeWriteLimiter, expensiveReadLimiter, checkRateLimit } from "@/lib/rate-limit"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const limited = await checkRateLimit(expensiveReadLimiter, `read:${session.user.id}`)
  if (limited) return limited

  const role = session.user.role ?? ""
  const url = new URL(req.url)
  const queryParams = Object.fromEntries(url.searchParams.entries())

  try {
    const query = transactionQuerySchema.parse(queryParams)

    if (role === "ADMIN") {
      const schoolId = await getAdminSchoolId(session.user.id)
      if (!schoolId) return NextResponse.json({ message: "No school assigned" }, { status: 403 })
      const result = await listSchoolTransactions(schoolId, query)
      return NextResponse.json(result)
    }

    if (role === "STUDENT") {
      const schoolId = await getStudentSchoolId(session.user.id)
      if (!schoolId) return NextResponse.json({ message: "No school assigned" }, { status: 403 })
      const student = await prisma.student.findFirst({
        where: { user_id: session.user.id, school_id: schoolId },
        select: { id: true },
      })
      if (!student) return NextResponse.json({ message: "Student not found" }, { status: 404 })
      const result = await listSchoolTransactions(schoolId, {
        ...query,
        studentId: student.id,
      })
      return NextResponse.json(result)
    }

    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 422 })
    }
    console.error("[GET /api/fees/transactions]", error)
    return NextResponse.json({ message: "Failed to fetch transactions" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const limited = await checkRateLimit(feeWriteLimiter, `fee-write:${session.user.id}`)
  if (limited) return limited

  const role = session.user.role ?? ""

  try {
    const body = await req.json()

    // ADMIN records a manual payment (FULL_MANUAL or HYBRID auto-verify by admin)
    if (role === "ADMIN") {
      const schoolId = await getAdminSchoolId(session.user.id)
      if (!schoolId) return NextResponse.json({ message: "No school assigned" }, { status: 403 })
      const validated = manualPaymentSchema.parse(body)
      const created = await recordManualPayment(schoolId, session.user.id, validated)
      return NextResponse.json(created, { status: 201 })
    }

    // STUDENT/parent submits proof for HYBRID flow
    if (role === "STUDENT") {
      const schoolId = await getStudentSchoolId(session.user.id)
      if (!schoolId) return NextResponse.json({ message: "No school assigned" }, { status: 403 })
      const student = await prisma.student.findFirst({
        where: { user_id: session.user.id, school_id: schoolId },
        select: { id: true },
      })
      if (!student) return NextResponse.json({ message: "Student not found" }, { status: 404 })

      // Disallow hybrid submission unless school has HYBRID mode configured
      const config = await prisma.schoolPaymentConfig.findUnique({
        where: { school_id: schoolId },
        select: { payment_mode: true },
      })
      if (!config || config.payment_mode !== "HYBRID") {
        return NextResponse.json(
          { message: "Hybrid payments are not enabled for this school" },
          { status: 400 },
        )
      }

      const validated = hybridUploadSchema.parse(body)
      const created = await submitHybridProof(
        schoolId,
        session.user.id,
        student.id,
        validated,
      )
      return NextResponse.json(created, { status: 201 })
    }

    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 422 })
    }
    if (error instanceof Error) {
      if (error.message === "STUDENT_NOT_FOUND")
        return NextResponse.json({ message: "Student not found" }, { status: 404 })
      if (error.message === "INVALID_LEDGER_ALLOCATION")
        return NextResponse.json(
          { message: "One or more ledger rows are invalid" },
          { status: 400 },
        )
      if (error.message === "DUPLICATE_TXN_REF")
        return NextResponse.json(
          { message: "A transaction with this reference already exists" },
          { status: 409 },
        )
      if (error.message.startsWith("PENDING_DUPLICATE")) {
        // Format: "PENDING_DUPLICATE:<receipt_no>"
        const existingReceipt = error.message.split(":")[1] ?? ""
        return NextResponse.json(
          {
            message: existingReceipt
              ? `A previous submission (${existingReceipt}) for this period is still awaiting admin verification. Please wait for it to be approved or rejected before trying again.`
              : "A previous submission for this period is still awaiting verification.",
          },
          { status: 409 },
        )
      }
      if (error.message.startsWith("ALLOCATION_EXCEEDS_DUE")) {
        return NextResponse.json(
          { message: "Allocation exceeds the outstanding amount on a ledger row" },
          { status: 400 },
        )
      }
      if (error.message === "INVALID_DATE")
        return NextResponse.json({ message: "Invalid paid date" }, { status: 422 })
    }
    console.error("[POST /api/fees/transactions]", error)
    return NextResponse.json({ message: "Failed to record transaction" }, { status: 500 })
  }
}
