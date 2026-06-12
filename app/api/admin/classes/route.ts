import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAdminSchoolId } from "@/services/attendance.service"
import { getGroupedSchoolClasses } from "@/services/class.service"
import { expensiveReadLimiter, checkRateLimit } from "@/lib/rate-limit"

/**
 * Returns the grouped class/section list for the calling admin's school.
 * Convenience wrapper over /api/schools/[schoolCode]/classes for admin UIs
 * that already know they're scoped to their own school (no schoolCode in path).
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const schoolId = await getAdminSchoolId(session.user.id)
  if (!schoolId) {
    return NextResponse.json({ message: "No school assigned" }, { status: 403 })
  }

  const limited = await checkRateLimit(expensiveReadLimiter, `classes:${session.user.id}`)
  if (limited) return limited

  const classes = await getGroupedSchoolClasses(schoolId)
  return NextResponse.json({ classes })
}
