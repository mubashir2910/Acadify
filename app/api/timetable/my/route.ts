import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getTeacherTimetable } from "@/services/timetable.service"

// GET — Teacher fetches their own schedule
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
    // Admins who have been assigned teaching duties (via ensureTeacherForUser)
    // can use this endpoint to view their own routine — getTeacherTimetable
    // resolves the Teacher row by user_id regardless of role.
    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const result = await getTeacherTimetable(session.user.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error("[GET /api/timetable/my]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
