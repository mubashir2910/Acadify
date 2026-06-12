import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getGroupedSchoolClasses } from "@/services/class.service"
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

  const school = await prisma.school.findUnique({
    where: { schoolCode },
    select: { id: true },
  })
  if (!school) {
    return NextResponse.json({ message: "School not found" }, { status: 404 })
  }

  if (role !== "SUPER_ADMIN") {
    if (role === "ADMIN" || role === "TEACHER") {
      const membership = await prisma.schoolUser.findFirst({
        where: { user_id: userId, school_id: school.id },
      })
      if (!membership) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
      }
    } else if (role === "STUDENT") {
      const student = await prisma.student.findFirst({
        where: { user_id: userId, school_id: school.id },
        select: { id: true },
      })
      if (!student) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
      }
    } else {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
  }

  const limited = await checkRateLimit(expensiveReadLimiter, `read:${userId}`)
  if (limited) return limited

  try {
    const classes = await getGroupedSchoolClasses(school.id)
    return NextResponse.json({ classes })
  } catch {
    return NextResponse.json({ message: "Failed to fetch classes" }, { status: 500 })
  }
}
