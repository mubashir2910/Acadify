import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getTeacherSelfMonthly } from "@/services/teacher-attendance.service"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const monthStr = searchParams.get("month") // "yyyy-MM"
    if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
      return NextResponse.json({ message: "Invalid or missing month" }, { status: 400 })
    }

    const [year, month] = monthStr.split("-").map(Number)
    const records = await getTeacherSelfMonthly(session.user.id, year, month)

    return NextResponse.json({ month: monthStr, records })
  } catch (error) {
    console.error("GET /api/teacher-attendance/monthly error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
