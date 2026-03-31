import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  getStudentAttendanceStats,
  getClassStudentStats,
  getAdminSchoolId,
} from "@/services/attendance.service"
import { prisma } from "@/lib/prisma"

// GET — Aggregated attendance stats (multi-role)
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const role = session.user.role

    // STUDENT: own stats
    if (role === "STUDENT") {
      const stats = await getStudentAttendanceStats(session.user.id)
      if (!stats) {
        return NextResponse.json({ message: "Student not found" }, { status: 404 })
      }
      return NextResponse.json(stats)
    }

    // TEACHER: class student stats (for history view)
    if (role === "TEACHER") {
      const teacher = await prisma.teacher.findFirst({
        where: { user_id: session.user.id },
        select: {
          school_id: true,
          classTeacher: { select: { class: true, section: true } },
        },
      })
      if (!teacher || !teacher.classTeacher) {
        return NextResponse.json({ assigned: false })
      }

      const result = await getClassStudentStats(
        teacher.school_id,
        teacher.classTeacher.class,
        teacher.classTeacher.section
      )
      return NextResponse.json({
        assigned: true,
        class: teacher.classTeacher.class,
        section: teacher.classTeacher.section,
        ...result,
      })
    }

    // ADMIN: school-wide stats (future: could add class filter)
    if (role === "ADMIN") {
      const schoolId = await getAdminSchoolId(session.user.id)
      if (!schoolId) {
        return NextResponse.json({ message: "School not found" }, { status: 404 })
      }

      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { session_started_on: true },
      })

      return NextResponse.json({
        sessionStartedOn: school?.session_started_on?.toISOString().split("T")[0] ?? null,
      })
    }

    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  } catch (error) {
    console.error("GET /api/attendance/summary error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
