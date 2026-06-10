import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { detectWallClockOverlap, getAdminSchoolId } from "@/services/timetable.service"
import type { DayOfWeek } from "@/schemas/timetable.schema"
import { dayOfWeekEnum } from "@/schemas/timetable.schema"
import { checkRateLimit, expensiveReadLimiter } from "@/lib/rate-limit"

const DAYS = new Set(dayOfWeekEnum.options)

/**
 * GET /api/timetable/overlap-check?teacherId=&day=&start=&end=&excludeGroupId=
 *
 * Returns wall-clock overlap warnings for the proposed slot across OTHER groups.
 * Read-only, fast — called by the AssignCellModal before queuing a change.
 */
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
    const limited = await checkRateLimit(
      expensiveReadLimiter,
      `read:${session.user.id}`,
    )
    if (limited) return limited

    const schoolId = await getAdminSchoolId(session.user.id)
    if (!schoolId) return NextResponse.json({ message: "School not found" }, { status: 404 })

    const url = new URL(request.url)
    const teacherId = url.searchParams.get("teacherId")
    const day = url.searchParams.get("day") as DayOfWeek | null
    const start = url.searchParams.get("start")
    const end = url.searchParams.get("end")
    const excludeGroupId = url.searchParams.get("excludeGroupId")

    if (!teacherId || !day || !start || !end || !excludeGroupId) {
      return NextResponse.json({ message: "Missing required params" }, { status: 400 })
    }
    if (!DAYS.has(day)) {
      return NextResponse.json({ message: "Invalid day" }, { status: 422 })
    }
    if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
      return NextResponse.json({ message: "Invalid time format" }, { status: 422 })
    }

    const warnings = await detectWallClockOverlap(schoolId, {
      teacher_id: teacherId,
      day_of_week: day,
      start_time: start,
      end_time: end,
      exclude_group_id: excludeGroupId,
    })
    return NextResponse.json(warnings)
  } catch (error) {
    console.error("[GET /api/timetable/overlap-check]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
