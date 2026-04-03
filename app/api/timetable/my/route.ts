import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getTeacherTimetable } from "@/services/timetable.service"

// GET — Teacher fetches their own schedule
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const result = await getTeacherTimetable(session.user.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error("[GET /api/timetable/my]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
