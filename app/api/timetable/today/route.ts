import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getTeacherTodaySchedule, getStudentTodaySchedule } from "@/services/timetable.service"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id: userId, role } = session.user

    if (role === "TEACHER") {
      const schedule = await getTeacherTodaySchedule(userId)
      return NextResponse.json(schedule)
    }

    if (role === "STUDENT") {
      const schedule = await getStudentTodaySchedule(userId)
      return NextResponse.json(schedule)
    }

    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  } catch (error) {
    console.error("[GET /api/timetable/today]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
