import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  getTimetableGrid,
  getStudentTimetable,
  getAdminSchoolId,
  getSchoolIdForTeacher,
} from "@/services/timetable.service"

/**
 * GET — multi-role.
 * - ADMIN / TEACHER: must pass ?groupId=<uuid>; returns the grid for that group.
 * - STUDENT: returns the student's group's days (resolved from their class+section).
 *
 * Writes have moved to /api/timetable/batch.
 */
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id: userId, role } = session.user

    if (role === "STUDENT") {
      const days = await getStudentTimetable(userId)
      return NextResponse.json(days)
    }

    if (role === "ADMIN" || role === "TEACHER") {
      const url = new URL(request.url)
      const groupId = url.searchParams.get("groupId")
      if (!groupId) {
        return NextResponse.json({ message: "groupId query parameter required" }, { status: 400 })
      }

      const schoolId =
        role === "ADMIN"
          ? await getAdminSchoolId(userId)
          : await getSchoolIdForTeacher(userId)
      if (!schoolId) return NextResponse.json({ message: "School not found" }, { status: 404 })

      const grid = await getTimetableGrid(schoolId, groupId)
      return NextResponse.json(grid)
    }

    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  } catch (error) {
    if (error instanceof Error && error.message === "GROUP_NOT_FOUND") {
      return NextResponse.json({ message: "Timetable group not found" }, { status: 404 })
    }
    console.error("[GET /api/timetable]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
