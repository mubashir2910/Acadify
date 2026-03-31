import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getAdminSchoolId } from "@/services/class-teacher.service"
import { getStudentsBySchoolId } from "@/services/student.service"

async function getTeacherSchoolId(userId: string): Promise<string | null> {
  const teacher = await prisma.teacher.findFirst({
    where: { user_id: userId },
    select: { school_id: true },
  })
  return teacher?.school_id ?? null
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id, role } = session.user

  let schoolId: string | null = null

  if (role === "ADMIN") {
    schoolId = await getAdminSchoolId(id)
  } else if (role === "TEACHER") {
    schoolId = await getTeacherSchoolId(id)
  } else {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  if (!schoolId) {
    return NextResponse.json({ message: "School not found" }, { status: 404 })
  }

  try {
    const students = await getStudentsBySchoolId(schoolId)
    return NextResponse.json(students)
  } catch (error) {
    console.error("[GET /api/students]", error)
    return NextResponse.json(
      { message: "Failed to fetch students" },
      { status: 500 }
    )
  }
}
