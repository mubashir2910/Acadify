import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getTeachersBySchoolCode } from "@/services/teacher.service"

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

  // Only SUPER_ADMIN and ADMIN of that school can view teachers
  if (role !== "SUPER_ADMIN") {
    if (role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

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

  try {
    const teachers = await getTeachersBySchoolCode(schoolCode)
    return NextResponse.json(teachers)
  } catch {
    return NextResponse.json({ message: "Failed to fetch teachers" }, { status: 500 })
  }
}
