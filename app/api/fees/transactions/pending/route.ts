import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAdminSchoolId } from "@/services/attendance.service"
import {
  countPendingVerifications,
  listPendingVerifications,
} from "@/services/fee-transaction.service"
import { expensiveReadLimiter, checkRateLimit } from "@/lib/rate-limit"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const limited = await checkRateLimit(expensiveReadLimiter, `read:${session.user.id}`)
  if (limited) return limited

  const schoolId = await getAdminSchoolId(session.user.id)
  if (!schoolId) return NextResponse.json({ message: "No school assigned" }, { status: 403 })

  const url = new URL(req.url)
  const countOnly = url.searchParams.get("countOnly") === "true"
  if (countOnly) {
    const count = await countPendingVerifications(schoolId)
    return NextResponse.json({ count })
  }

  const classFilter = url.searchParams.get("class") ?? undefined
  const sectionFilter = url.searchParams.get("section") ?? undefined
  const page = Number(url.searchParams.get("page") ?? "1")
  const pageSize = Number(url.searchParams.get("pageSize") ?? "50")

  try {
    const result = await listPendingVerifications(schoolId, {
      class: classFilter,
      section: sectionFilter,
      page,
      pageSize,
    })
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ message: "Failed to fetch pending" }, { status: 500 })
  }
}
