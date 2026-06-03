import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  getAdminSchoolId,
  getSchoolTeacherStats,
  getTeacherSelfStats,
} from "@/services/teacher-attendance.service"
import { expensiveReadLimiter, checkRateLimit } from "@/lib/rate-limit"

// GET — Teacher self stats OR per-teacher school-wide stats (admin)
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const limited = await checkRateLimit(
      expensiveReadLimiter,
      `read:${session.user.id}`,
    )
    if (limited) return limited

    const role = session.user.role

    if (role === "TEACHER") {
      const stats = await getTeacherSelfStats(session.user.id)
      if (!stats) {
        return NextResponse.json({ message: "Teacher not found" }, { status: 404 })
      }
      return NextResponse.json(stats)
    }

    if (role === "ADMIN") {
      const schoolId = await getAdminSchoolId(session.user.id)
      if (!schoolId) {
        return NextResponse.json({ message: "School not found" }, { status: 404 })
      }
      const result = await getSchoolTeacherStats(schoolId)
      return NextResponse.json(result)
    }

    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  } catch (error) {
    console.error("GET /api/teacher-attendance/summary error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
