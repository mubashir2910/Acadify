import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  getAdminSchoolId,
  getAvailableAdmins,
} from "@/services/class-teacher.service"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const schoolId = await getAdminSchoolId(session.user.id)
    if (!schoolId) {
      return NextResponse.json({ message: "No school found" }, { status: 404 })
    }

    const admins = await getAvailableAdmins(schoolId)
    return NextResponse.json(admins)
  } catch (error) {
    console.error("[GET /api/class-teachers/available-admins]", error)
    return NextResponse.json(
      { message: "Failed to fetch admins" },
      { status: 500 },
    )
  }
}
