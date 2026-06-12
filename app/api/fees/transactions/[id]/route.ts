import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import {
  getAdminSchoolId,
  getStudentSchoolId,
} from "@/services/attendance.service"
import { editTransaction, getTransaction } from "@/services/fee-transaction.service"
import { editTransactionSchema } from "@/schemas/fee-transaction.schema"
import { feeWriteLimiter, checkRateLimit } from "@/lib/rate-limit"

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const role = session.user.role ?? ""
  const { id } = await ctx.params

  let schoolId: string | null = null
  if (role === "ADMIN") schoolId = await getAdminSchoolId(session.user.id)
  else if (role === "STUDENT") schoolId = await getStudentSchoolId(session.user.id)
  if (!schoolId) return NextResponse.json({ message: "No school assigned" }, { status: 403 })

  const txn = await getTransaction(schoolId, id)
  if (!txn) return NextResponse.json({ message: "Not found" }, { status: 404 })

  // Students may only see their own transactions
  if (role === "STUDENT") {
    const student = await prisma.student.findFirst({
      where: { user_id: session.user.id, school_id: schoolId },
      select: { id: true },
    })
    if (!student || txn.student.id !== student.id)
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json(txn)
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role ?? "")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }
  const limited = await checkRateLimit(feeWriteLimiter, `fee-write:${session.user.id}`)
  if (limited) return limited

  let schoolId: string | null = null
  if (session.user.role === "ADMIN") {
    schoolId = await getAdminSchoolId(session.user.id)
  } else {
    // SUPER_ADMIN: derive school from the transaction itself
    const { id } = await ctx.params
    const txn = await prisma.feeTransaction.findUnique({
      where: { id },
      select: { school_id: true },
    })
    schoolId = txn?.school_id ?? null
  }
  if (!schoolId) return NextResponse.json({ message: "Forbidden" }, { status: 403 })

  const { id } = await ctx.params

  try {
    const body = await req.json()
    const validated = editTransactionSchema.parse(body)
    const updated = await editTransaction(
      schoolId,
      { userId: session.user.id, role: session.user.role ?? "" },
      id,
      validated,
    )
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 422 })
    }
    if (error instanceof Error) {
      if (error.message === "TRANSACTION_NOT_FOUND")
        return NextResponse.json({ message: "Transaction not found" }, { status: 404 })
      if (error.message === "CANNOT_EDIT_FINAL_STATE")
        return NextResponse.json(
          { message: "Cannot edit a rejected/cancelled transaction" },
          { status: 400 },
        )
      if (error.message === "EDIT_WINDOW_EXPIRED")
        return NextResponse.json(
          { message: "Edit window of 24 hours has expired" },
          { status: 403 },
        )
      if (error.message === "DUPLICATE_TXN_REF")
        return NextResponse.json(
          { message: "Duplicate transaction reference" },
          { status: 409 },
        )
      if (error.message === "INVALID_LEDGER_ALLOCATION")
        return NextResponse.json({ message: "Invalid allocations" }, { status: 400 })
    }
    console.error("[PATCH /api/fees/transactions/[id]]", error)
    return NextResponse.json({ message: "Failed to edit transaction" }, { status: 500 })
  }
}
