import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSchoolClassSections } from "@/services/attendance.service"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { role, id: userId } = session.user
    if (!["ADMIN", "TEACHER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Resolve school_id for either role
    const schoolUser = await prisma.schoolUser.findFirst({
      where: { user_id: userId, status: "ACTIVE" },
      select: { school_id: true },
    })
    if (!schoolUser) {
      return NextResponse.json({ error: "School not found" }, { status: 404 })
    }

    const sections = await getSchoolClassSections(schoolUser.school_id)
    return NextResponse.json(sections)
  } catch (error) {
    console.error("[GET /api/notifications/class-sections]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
