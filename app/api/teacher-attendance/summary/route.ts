import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getTeacherSelfStats } from "@/services/teacher-attendance.service"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const stats = await getTeacherSelfStats(session.user.id)
    if (!stats) {
      return NextResponse.json({ message: "Teacher not found" }, { status: 404 })
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("GET /api/teacher-attendance/summary error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
