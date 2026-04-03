import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { ZodError } from "zod"
import { getAdminSchoolId } from "@/services/class-teacher.service"
import { getStudentsBySchoolId, createSingleStudent } from "@/services/student.service"
import { createStudentSchema } from "@/schemas/student.schema"
import { writeLimiter, checkRateLimit } from "@/lib/rate-limit"

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

// POST — Admin creates a single student
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const limited = await checkRateLimit(writeLimiter, `write:${session.user.id}`)
  if (limited) return limited

  try {
    const body = await request.json()
    const input = createStudentSchema.parse(body)
    const result = await createSingleStudent(session.user.id, input)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Validation error" },
        { status: 422 }
      )
    }
    if (error instanceof Error) {
      const errorMap: Record<string, [string, number]> = {
        EMAIL_TAKEN:          ["Email is already registered", 409],
        ADMISSION_NO_TAKEN:   ["Admission number already exists in this school", 409],
        ROLL_NO_TAKEN:        ["Roll number already taken in this class and section", 409],
        INVALID_DATE_OF_BIRTH:["Invalid date of birth format (use DD-MM-YYYY)", 422],
        SCHOOL_NOT_FOUND:     ["School not found", 404],
      }
      const entry = errorMap[error.message]
      if (entry) return NextResponse.json({ message: entry[0] }, { status: entry[1] })
    }
    console.error("[POST /api/students]", error)
    return NextResponse.json({ message: "Failed to create student" }, { status: 500 })
  }
}
