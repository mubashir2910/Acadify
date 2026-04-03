import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAdminSchoolId } from "@/services/class-teacher.service"
import { getSchoolClassSections } from "@/services/attendance.service"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const schoolId = await getAdminSchoolId(session.user.id)
    if (!schoolId) return NextResponse.json({ message: "Forbidden" }, { status: 403 })

    const sections = await getSchoolClassSections(schoolId)
    return NextResponse.json(sections)
  } catch (error) {
    console.error("[GET /api/class-teachers/all-class-sections]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
