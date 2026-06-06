import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { z, ZodError } from "zod"
import { prisma } from "@/lib/prisma"
import { getStudentArenaProfile } from "@/services/quiz-analytics.service"

const querySchema = z.object({
  studentId: z.string().uuid().optional(),
  monthsBack: z
    .string()
    .regex(/^\d+$/)
    .transform((s) => parseInt(s, 10))
    .pipe(z.number().int().min(1).max(24))
    .optional(),
})

// Returns a structured payload describing one student's Arena performance.
// Designed for downstream AI consumption (monthly report generation).
//
// Auth gating:
//   STUDENT  → self only; studentId query param ignored.
//   TEACHER  → must be the class teacher of the target student's class+section.
//   ADMIN / SUPER_ADMIN → any student inside their own school.
export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const query = querySchema.parse({
      studentId: searchParams.get("studentId") ?? undefined,
      monthsBack: searchParams.get("monthsBack") ?? undefined,
    })

    const callerId = session.user.id
    const role = session.user.role as string

    let targetStudentId: string

    if (role === "STUDENT") {
      // Self only — ignore any provided studentId
      targetStudentId = callerId
    } else if (role === "TEACHER") {
      if (!query.studentId) {
        return NextResponse.json({ error: "studentId is required" }, { status: 422 })
      }
      const [teacher, target] = await Promise.all([
        prisma.teacher.findFirst({
          where: { user_id: callerId },
          select: { id: true, school_id: true, classTeacher: { select: { class: true, section: true } } },
        }),
        prisma.student.findFirst({
          where: { user_id: query.studentId },
          select: { school_id: true, class: true, section: true },
        }),
      ])
      if (!teacher) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      if (!target) return NextResponse.json({ error: "Student not found" }, { status: 404 })
      if (target.school_id !== teacher.school_id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      // Must be the class teacher for the target's class+section
      if (
        !teacher.classTeacher ||
        teacher.classTeacher.class !== target.class ||
        teacher.classTeacher.section !== target.section
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      targetStudentId = query.studentId
    } else if (role === "ADMIN" || role === "SUPER_ADMIN") {
      if (!query.studentId) {
        return NextResponse.json({ error: "studentId is required" }, { status: 422 })
      }
      // ADMIN can read any student inside their school; SUPER_ADMIN unrestricted
      if (role === "ADMIN") {
        const [adminSchool, target] = await Promise.all([
          prisma.schoolUser.findFirst({
            where: { user_id: callerId, role: "ADMIN", status: "ACTIVE" },
            select: { school_id: true },
          }),
          prisma.student.findFirst({
            where: { user_id: query.studentId },
            select: { school_id: true },
          }),
        ])
        if (!adminSchool) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        if (!target) return NextResponse.json({ error: "Student not found" }, { status: 404 })
        if (target.school_id !== adminSchool.school_id) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
      }
      targetStudentId = query.studentId
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const profile = await getStudentArenaProfile(targetStudentId, query.monthsBack ?? 6)
    return NextResponse.json(profile)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 422 })
    }
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR"
    if (msg === "STUDENT_NOT_FOUND") {
      return NextResponse.json({ error: msg }, { status: 404 })
    }
    console.error("[arena/student-profile]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
