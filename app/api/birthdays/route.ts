import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAdminSchoolId, getStudentSchoolId } from "@/services/attendance.service"
import { getTeacherSchoolId } from "@/services/calendar.service"
import { getTodaysBirthdays } from "@/services/birthday.service"

async function resolveSchoolId(
  userId: string,
  role: string
): Promise<string | null> {
  if (role === "ADMIN") return getAdminSchoolId(userId)
  if (role === "TEACHER") return getTeacherSchoolId(userId)
  if (role === "STUDENT") return getStudentSchoolId(userId)
  return null
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    if (!["ADMIN", "TEACHER", "STUDENT"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const schoolId = await resolveSchoolId(session.user.id, session.user.role)
    if (!schoolId) {
      return NextResponse.json({ message: "School not found" }, { status: 404 })
    }

    const birthdays = await getTodaysBirthdays(schoolId)

    return NextResponse.json({ birthdays })
  } catch (error) {
    console.error("GET /api/birthdays error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
