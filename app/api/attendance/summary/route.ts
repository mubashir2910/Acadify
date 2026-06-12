import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  getStudentAttendanceStats,
  getClassStudentStats,
  getAdminSchoolId,
} from "@/services/attendance.service"
import { prisma } from "@/lib/prisma"
import { expensiveReadLimiter, checkRateLimit } from "@/lib/rate-limit"

// GET — Aggregated attendance stats (multi-role)
//   Admin: optional ?class=X&section=Y returns per-student totals (history view).
//          Without class params, returns just sessionStartedOn (used by the
//          History tab to detect whether a class filter must be picked first).
export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const limited = await checkRateLimit(expensiveReadLimiter, `read:${session.user.id}`)
    if (limited) return limited

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

    // ADMIN: optionally per-class history stats; otherwise just session anchor.
    // When ?scope=class is set, route through the class-teacher branch (used
    // when an admin who is a class teacher views the teacher-style History).
    if (role === "ADMIN") {
      const url = new URL(req.url)
      const scope = url.searchParams.get("scope")

      if (scope === "class") {
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
          teacher.classTeacher.section,
        )
        return NextResponse.json({
          assigned: true,
          class: teacher.classTeacher.class,
          section: teacher.classTeacher.section,
          ...result,
        })
      }

      const schoolId = await getAdminSchoolId(session.user.id)
      if (!schoolId) {
        return NextResponse.json({ message: "School not found" }, { status: 404 })
      }

      const className = url.searchParams.get("class")
      const section = url.searchParams.get("section")

      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { session_started_on: true },
      })
      const sessionStartedOn =
        school?.session_started_on?.toISOString().split("T")[0] ?? null

      if (className && section) {
        const result = await getClassStudentStats(schoolId, className, section)
        return NextResponse.json({
          class: className,
          section,
          ...result,
        })
      }

      return NextResponse.json({ sessionStartedOn })
    }

    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  } catch (error) {
    console.error("GET /api/attendance/summary error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
