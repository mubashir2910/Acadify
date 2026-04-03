import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getStudentsBySchoolCode } from "@/services/student.service"
import { expensiveReadLimiter, checkRateLimit } from "@/lib/rate-limit"

interface RouteParams {
  params: Promise<{ schoolCode: string }>
}

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { schoolCode } = await params
  const { id: userId, role } = session.user

  // STUDENT role never has access
  if (role !== "SUPER_ADMIN") {
    if (role !== "ADMIN" && role !== "TEACHER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // ADMIN/TEACHER must belong to the requested school
    const school = await prisma.school.findUnique({
      where: { schoolCode },
      select: { id: true },
    })
    if (!school) {
      return NextResponse.json({ message: "School not found" }, { status: 404 })
    }

    const membership = await prisma.schoolUser.findFirst({
      where: { user_id: userId, school_id: school.id },
    })
    if (!membership) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
  }

  const limited = await checkRateLimit(expensiveReadLimiter, `read:${session.user.id}`)
  if (limited) return limited

  try {
    const students = await getStudentsBySchoolCode(schoolCode)
    if (students === null) {
      return NextResponse.json({ message: "School not found" }, { status: 404 })
    }
    return NextResponse.json(students)
  } catch {
    return NextResponse.json({ message: "Failed to fetch students" }, { status: 500 })
  }
}
