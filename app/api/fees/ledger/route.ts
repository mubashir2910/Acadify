import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import {
  getAdminSchoolId,
  getStudentSchoolId,
} from "@/services/attendance.service"
import { getClassLedger, getStudentLedger } from "@/services/fee-ledger.service"
import { ledgerQuerySchema } from "@/schemas/fee-ledger.schema"
import { expensiveReadLimiter, checkRateLimit } from "@/lib/rate-limit"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const limited = await checkRateLimit(expensiveReadLimiter, `read:${session.user.id}`)
  if (limited) return limited

  const role = session.user.role ?? ""
  const url = new URL(req.url)

  try {
    const queryParams = Object.fromEntries(url.searchParams.entries())
    const query = ledgerQuerySchema.parse(queryParams)

    if (role === "ADMIN") {
      const schoolId = await getAdminSchoolId(session.user.id)
      if (!schoolId) return NextResponse.json({ message: "No school assigned" }, { status: 403 })
      const result = await getClassLedger(schoolId, query)
      return NextResponse.json(result)
    }

    if (role === "STUDENT") {
      const schoolId = await getStudentSchoolId(session.user.id)
      if (!schoolId) return NextResponse.json({ message: "No school assigned" }, { status: 403 })
      // resolve student.id from user.id
      const student = await prisma.student.findFirst({
        where: { user_id: session.user.id, school_id: schoolId },
        select: { id: true },
      })
      if (!student) return NextResponse.json({ message: "Student not found" }, { status: 404 })
      const items = await getStudentLedger(schoolId, student.id, query.sessionId)
      return NextResponse.json({ items, total: items.length, page: 1, pageSize: items.length })
    }

    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 422 })
    }
    console.error("[GET /api/fees/ledger]", error)
    return NextResponse.json({ message: "Failed to fetch ledger" }, { status: 500 })
  }
}
