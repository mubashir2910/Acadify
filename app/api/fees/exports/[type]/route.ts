import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAdminSchoolId } from "@/services/attendance.service"
import {
  exportClassFeeReport,
  exportMonthlyCollections,
  exportPendingVerifications,
  exportUnpaidStudents,
} from "@/services/fee-export.service"
import { feeExportLimiter, checkRateLimit } from "@/lib/rate-limit"

const VALID_TYPES = [
  "unpaid",
  "monthly-collections",
  "pending-verifications",
  "class-report",
] as const
type ExportType = (typeof VALID_TYPES)[number]

function isExportType(s: string): s is ExportType {
  return (VALID_TYPES as readonly string[]).includes(s)
}

export async function GET(req: Request, ctx: { params: Promise<{ type: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const limited = await checkRateLimit(feeExportLimiter, `fee-export:${session.user.id}`)
  if (limited) return limited

  const schoolId = await getAdminSchoolId(session.user.id)
  if (!schoolId) return NextResponse.json({ message: "No school assigned" }, { status: 403 })

  const { type } = await ctx.params
  if (!isExportType(type)) {
    return NextResponse.json({ message: "Invalid export type" }, { status: 400 })
  }

  const url = new URL(req.url)
  const filter = {
    sessionId: url.searchParams.get("sessionId") ?? undefined,
    class: url.searchParams.get("class") ?? undefined,
    section: url.searchParams.get("section") ?? undefined,
    month: url.searchParams.get("month")
      ? Number(url.searchParams.get("month"))
      : undefined,
    year: url.searchParams.get("year") ? Number(url.searchParams.get("year")) : undefined,
  }

  try {
    let csv = ""
    let filename = ""
    if (type === "unpaid") {
      csv = await exportUnpaidStudents(schoolId, filter)
      filename = `unpaid-students-${Date.now()}.csv`
    } else if (type === "monthly-collections") {
      csv = await exportMonthlyCollections(schoolId, filter)
      filename = `collections-${filter.year ?? "all"}-${filter.month ?? "all"}.csv`
    } else if (type === "pending-verifications") {
      csv = await exportPendingVerifications(schoolId)
      filename = `pending-verifications-${Date.now()}.csv`
    } else if (type === "class-report") {
      csv = await exportClassFeeReport(schoolId, filter)
      filename = `class-${filter.class ?? "all"}-fee-report.csv`
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === "CLASS_FILTER_REQUIRED") {
      return NextResponse.json({ message: "Class filter is required" }, { status: 400 })
    }
    console.error("[GET /api/fees/exports]", error)
    return NextResponse.json({ message: "Failed to generate export" }, { status: 500 })
  }
}
