import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAdminSchoolId } from "@/services/attendance.service"
import { getSchoolMonthlyBlocks } from "@/services/fee-monthly-block.service"
import { expensiveReadLimiter, checkRateLimit } from "@/lib/rate-limit"

const STATUSES = new Set(["PAID", "PARTIAL", "PENDING", "OVERDUE"])

/**
 * Admin view: returns monthly blocks per (student × month) across the admin's school.
 * Filterable by class/section/status/search. Includes server-side aggregated totals
 * so the UI summary is correct regardless of pagination.
 */
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const schoolId = await getAdminSchoolId(session.user.id)
  if (!schoolId) return NextResponse.json({ message: "No school assigned" }, { status: 403 })

  const limited = await checkRateLimit(expensiveReadLimiter, `admin-blocks:${session.user.id}`)
  if (limited) return limited

  const url = new URL(req.url)
  const statusParam = url.searchParams.get("status")
  const status =
    statusParam && STATUSES.has(statusParam)
      ? (statusParam as "PAID" | "PARTIAL" | "PENDING" | "OVERDUE")
      : undefined

  const pageParam = Number(url.searchParams.get("page") ?? 1)
  const pageSizeParam = Number(url.searchParams.get("pageSize") ?? 25)
  const page = Number.isFinite(pageParam) && pageParam >= 1 ? Math.floor(pageParam) : 1
  const pageSize =
    Number.isFinite(pageSizeParam) && pageSizeParam >= 5 && pageSizeParam <= 100
      ? Math.floor(pageSizeParam)
      : 25

  try {
    const result = await getSchoolMonthlyBlocks(schoolId, {
      sessionId: url.searchParams.get("sessionId") ?? undefined,
      class: url.searchParams.get("class") ?? undefined,
      section: url.searchParams.get("section") ?? undefined,
      status,
      search: url.searchParams.get("search") ?? undefined,
      page,
      pageSize,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("[GET /api/fees/monthly-blocks/admin]", error)
    return NextResponse.json({ message: "Failed to load monthly blocks" }, { status: 500 })
  }
}
