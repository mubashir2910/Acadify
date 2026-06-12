import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * Returns the calling admin's teaching context — whether they've been assigned
 * as a class teacher and/or have any timetable entries. Used by the sidebar
 * (to show the Student Attendance item) and by the admin dashboard (to show
 * Today's Assigned Classes).
 *
 * Detection is purely by assignment data, not by role label — the same admin
 * with no teaching duties gets `{ isClassTeacher: false, hasTimetable: false }`
 * and the existing admin experience is unchanged.
 */
export type AdminTeachingContext = {
  isClassTeacher: boolean
  hasTimetable: boolean
  class: string | null
  section: string | null
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    // Find the admin's Teacher row (if any) and resolve their class-teacher
    // assignment + timetable presence in parallel.
    const teacher = await prisma.teacher.findFirst({
      where: { user_id: session.user.id, status: "ACTIVE" },
      select: {
        id: true,
        classTeacher: { select: { class: true, section: true } },
      },
    })

    if (!teacher) {
      const empty: AdminTeachingContext = {
        isClassTeacher: false,
        hasTimetable: false,
        class: null,
        section: null,
      }
      return NextResponse.json(empty)
    }

    const timetableCount = await prisma.timetable.count({
      where: { teacher_id: teacher.id },
    })

    const context: AdminTeachingContext = {
      isClassTeacher: Boolean(teacher.classTeacher),
      hasTimetable: timetableCount > 0,
      class: teacher.classTeacher?.class ?? null,
      section: teacher.classTeacher?.section ?? null,
    }
    return NextResponse.json(context)
  } catch (error) {
    console.error("[GET /api/admin/teaching-context]", error)
    return NextResponse.json(
      { message: "Failed to fetch teaching context" },
      { status: 500 },
    )
  }
}
