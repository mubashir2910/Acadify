import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getStudentMonthlyBlocks } from "@/services/fee-monthly-block.service"
import { expensiveReadLimiter, checkRateLimit } from "@/lib/rate-limit"

/**
 * Returns the calling student's fees grouped into monthly blocks.
 * Optional `?studentId=` lets an ADMIN view another student's blocks
 * (provided the student belongs to the admin's school).
 */
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const overrideStudentId = url.searchParams.get("studentId")
  const sessionId = url.searchParams.get("sessionId") || undefined

  const limited = await checkRateLimit(expensiveReadLimiter, `monthly-blocks:${session.user.id}`)
  if (limited) return limited

  try {
    let schoolId: string | null = null
    let studentId: string | null = null

    if (session.user.role === "STUDENT") {
      const student = await prisma.student.findFirst({
        where: { user_id: session.user.id },
        select: { id: true, school_id: true },
      })
      if (!student) {
        return NextResponse.json({ message: "Student record not found" }, { status: 404 })
      }
      schoolId = student.school_id
      studentId = student.id
    } else if (session.user.role === "ADMIN" && overrideStudentId) {
      const adminLink = await prisma.schoolUser.findFirst({
        where: { user_id: session.user.id, role: "ADMIN", status: "ACTIVE" },
        select: { school_id: true },
      })
      if (!adminLink) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 })
      }
      const targetStudent = await prisma.student.findFirst({
        where: { id: overrideStudentId, school_id: adminLink.school_id },
        select: { id: true, school_id: true },
      })
      if (!targetStudent) {
        return NextResponse.json({ message: "Student not found in your school" }, { status: 404 })
      }
      schoolId = targetStudent.school_id
      studentId = targetStudent.id
    } else {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const blocks = await getStudentMonthlyBlocks(schoolId, studentId, sessionId)
    return NextResponse.json({ blocks })
  } catch (error) {
    console.error("[GET /api/fees/monthly-blocks]", error)
    return NextResponse.json({ message: "Failed to load monthly blocks" }, { status: 500 })
  }
}
