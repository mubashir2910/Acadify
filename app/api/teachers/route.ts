import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { ZodError } from "zod"
import { createSingleTeacher } from "@/services/teacher.service"
import { createTeacherSchema } from "@/schemas/teacher.schema"
import { getAdminSchoolId } from "@/services/attendance.service"
import { prisma } from "@/lib/prisma"
import { writeLimiter, checkRateLimit } from "@/lib/rate-limit"

// GET — Admin fetches active teachers list (for dropdowns)
export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const schoolId = await getAdminSchoolId(session.user.id)
    if (!schoolId) {
      return NextResponse.json({ message: "School not found" }, { status: 404 })
    }

    const teachers = await prisma.teacher.findMany({
      where: { school_id: schoolId, status: "ACTIVE" },
      select: {
        id: true,
        employee_id: true,
        user: { select: { name: true } },
      },
      orderBy: { user: { name: "asc" } },
    })

    return NextResponse.json(teachers)
  } catch (error) {
    console.error("[GET /api/teachers]", error)
    return NextResponse.json({ message: "Failed to fetch teachers" }, { status: 500 })
  }
}

// POST — Admin creates a single teacher
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const limited = await checkRateLimit(writeLimiter, `write:${session.user.id}`)
  if (limited) return limited

  try {
    const body = await request.json()
    const input = createTeacherSchema.parse(body)
    const result = await createSingleTeacher(session.user.id, input)
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
        EMAIL_TAKEN:           ["Email is already registered", 409],
        INVALID_DATE_OF_BIRTH: ["Invalid date of birth format (use DD-MM-YYYY)", 422],
        SCHOOL_NOT_FOUND:      ["School not found", 404],
      }
      const entry = errorMap[error.message]
      if (entry) return NextResponse.json({ message: entry[0] }, { status: entry[1] })
    }
    console.error("[POST /api/teachers]", error)
    return NextResponse.json({ message: "Failed to create teacher" }, { status: 500 })
  }
}
