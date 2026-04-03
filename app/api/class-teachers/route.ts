import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import {
  assignClassTeacherSchema,
  changeClassTeacherSchema,
} from "@/schemas/class-teacher.schema"
import {
  getAdminSchoolId,
  getClassTeacherAssignments,
  assignClassTeacher,
  changeClassTeacher,
} from "@/services/class-teacher.service"
import { writeLimiter, checkRateLimit } from "@/lib/rate-limit"

const ERROR_STATUS: Record<string, number> = {
  TEACHER_NOT_FOUND: 404,
  TEACHER_ALREADY_ASSIGNED: 409,
  CLASS_ALREADY_ASSIGNED: 409,
  ASSIGNMENT_NOT_FOUND: 404,
}

async function getSchoolIdOrFail(userId: string) {
  const schoolId = await getAdminSchoolId(userId)
  if (!schoolId) throw new Error("NO_SCHOOL")
  return schoolId
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const schoolId = await getSchoolIdOrFail(session.user.id)
    const assignments = await getClassTeacherAssignments(schoolId)
    return NextResponse.json(assignments)
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    console.error("[GET /api/class-teachers]", error)

    if (msg === "NO_SCHOOL") {
      return NextResponse.json(
        { message: "No school found for this admin" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: "Failed to fetch assignments" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const limited = await checkRateLimit(writeLimiter, `write:${session.user.id}`)
  if (limited) return limited

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 })
  }

  try {
    const input = assignClassTeacherSchema.parse(body)
    const schoolId = await getSchoolIdOrFail(session.user.id)
    const result = await assignClassTeacher(
      schoolId,
      input.teacherId,
      input.class,
      input.section
    )
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0].message },
        { status: 422 }
      )
    }
    if (error instanceof Error && ERROR_STATUS[error.message]) {
      return NextResponse.json(
        { message: error.message },
        { status: ERROR_STATUS[error.message] }
      )
    }
    console.error("[POST /api/class-teachers]", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const limited = await checkRateLimit(writeLimiter, `write:${session.user.id}`)
  if (limited) return limited

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 })
  }

  try {
    const input = changeClassTeacherSchema.parse(body)
    const schoolId = await getSchoolIdOrFail(session.user.id)
    const result = await changeClassTeacher(
      schoolId,
      input.class,
      input.section,
      input.newTeacherId
    )
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0].message },
        { status: 422 }
      )
    }
    if (error instanceof Error && ERROR_STATUS[error.message]) {
      return NextResponse.json(
        { message: error.message },
        { status: ERROR_STATUS[error.message] }
      )
    }
    console.error("[PUT /api/class-teachers]", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
