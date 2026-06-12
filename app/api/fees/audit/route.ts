import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getAdminSchoolId } from "@/services/attendance.service"
import { listAuditLogs } from "@/services/fee-audit.service"
import { expensiveReadLimiter, checkRateLimit } from "@/lib/rate-limit"
import type { FeeAuditAction } from "@prisma/client"

const ENTITY_TYPES = [
  "LEDGER",
  "TRANSACTION",
  "STRUCTURE",
  "WAIVER",
  "PAYMENT_CONFIG",
  "SESSION",
  "SCHOOL_BRANDING",
  "BANK_ACCOUNT",
  "UPI_ACCOUNT",
  "QR_CODE",
  "MONTHLY_LATE_FEE",
] as const

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const requestedSchoolCode = url.searchParams.get("schoolCode")
  const requestedSchoolId = url.searchParams.get("schoolId")

  // Resolve target school based on role
  let schoolId: string | null = null
  if (session.user.role === "SUPER_ADMIN") {
    if (requestedSchoolId) {
      const school = await prisma.school.findUnique({ where: { id: requestedSchoolId }, select: { id: true } })
      schoolId = school?.id ?? null
    } else if (requestedSchoolCode) {
      const school = await prisma.school.findUnique({
        where: { schoolCode: requestedSchoolCode },
        select: { id: true },
      })
      schoolId = school?.id ?? null
    }
    if (!schoolId) {
      return NextResponse.json({ message: "schoolCode or schoolId is required for super-admin" }, { status: 400 })
    }
  } else if (session.user.role === "ADMIN") {
    schoolId = await getAdminSchoolId(session.user.id)
    if (!schoolId) return NextResponse.json({ message: "No school assigned" }, { status: 403 })
  } else {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const limited = await checkRateLimit(expensiveReadLimiter, `audit:${session.user.id}`)
  if (limited) return limited

  const entityTypeParam = url.searchParams.get("entityType")
  const entityType =
    entityTypeParam && (ENTITY_TYPES as readonly string[]).includes(entityTypeParam)
      ? (entityTypeParam as (typeof ENTITY_TYPES)[number])
      : undefined

  const result = await listAuditLogs(schoolId, {
    entityType,
    action: (url.searchParams.get("action") as FeeAuditAction | undefined) ?? undefined,
    actorUserId: url.searchParams.get("actorUserId") ?? undefined,
    from: url.searchParams.get("from") ? new Date(url.searchParams.get("from")!) : undefined,
    to: url.searchParams.get("to") ? new Date(url.searchParams.get("to")!) : undefined,
    page: Number(url.searchParams.get("page") ?? "1"),
    pageSize: Number(url.searchParams.get("pageSize") ?? "50"),
  })
  return NextResponse.json(result)
}
