import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getAdminSchoolId } from "@/services/class-teacher.service"

// Returns all active admin users in the caller's school. Used by assignment
// pickers (timetable cells, class-teacher assignment) so admins can be chosen
// as teaching assignees. Each entry is keyed by userId — the assignment APIs
// resolve it to a Teacher row on demand (idempotent via ensureTeacherForUser).
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

    const rows = await prisma.schoolUser.findMany({
      where: {
        school_id: schoolId,
        role: "ADMIN",
        status: "ACTIVE",
        user: { is_active: true, role: "ADMIN" },
      },
      select: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { user: { name: "asc" } },
    })

    return NextResponse.json(
      rows.map((r) => ({ userId: r.user.id, name: r.user.name })),
    )
  } catch (error) {
    console.error("[GET /api/admins/teaching-eligible]", error)
    return NextResponse.json(
      { message: "Failed to fetch admins" },
      { status: 500 },
    )
  }
}
