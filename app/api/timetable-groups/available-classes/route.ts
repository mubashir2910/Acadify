import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSchoolClassesNotInAnyGroup } from "@/services/timetable-group.service"
import { getAdminSchoolId } from "@/services/timetable.service"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
    const schoolId = await getAdminSchoolId(session.user.id)
    if (!schoolId) return NextResponse.json({ message: "School not found" }, { status: 404 })

    const classes = await getSchoolClassesNotInAnyGroup(schoolId)
    return NextResponse.json(classes)
  } catch (error) {
    console.error("[GET /api/timetable-groups/available-classes]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
