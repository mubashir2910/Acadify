import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { ZodError } from "zod"
import { Prisma } from "@prisma/client"
import { assignTimetableSchema, updateTimetableSchema, deleteTimetableSchema } from "@/schemas/timetable.schema"
import {
  getTimetableGrid,
  assignTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
  getStudentTimetable,
  getAdminSchoolId,
  getSchoolIdForTeacher,
} from "@/services/timetable.service"
import { writeLimiter, checkRateLimit } from "@/lib/rate-limit"

const CONFLICT_ERROR_MAP: Record<string, string> = {
  TEACHER_CONFLICT: "This teacher is already assigned to another class during this period",
  CLASS_CONFLICT: "This class already has a subject assigned for this period",
  BREAK_PERIOD_NOT_ASSIGNABLE: "Cannot assign a subject to a break period",
  PERIOD_NOT_FOUND: "Period not found",
  TEACHER_NOT_FOUND: "Teacher not found",
  ENTRY_NOT_FOUND: "Timetable entry not found",
}

// GET — Multi-role: returns timetable grid (admin/teacher) or student view
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const { id: userId, role } = session.user

    if (role === "ADMIN") {
      const schoolId = await getAdminSchoolId(userId)
      if (!schoolId) return NextResponse.json({ message: "School not found" }, { status: 404 })
      const grid = await getTimetableGrid(schoolId)
      return NextResponse.json(grid)
    }

    if (role === "TEACHER") {
      const schoolId = await getSchoolIdForTeacher(userId)
      if (!schoolId) return NextResponse.json({ message: "School not found" }, { status: 404 })
      const grid = await getTimetableGrid(schoolId)
      return NextResponse.json(grid)
    }

    if (role === "STUDENT") {
      const days = await getStudentTimetable(userId)
      return NextResponse.json(days)
    }

    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  } catch (error) {
    console.error("[GET /api/timetable]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

// POST — Admin assigns a timetable entry
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const limited = await checkRateLimit(writeLimiter, `write:${session.user.id}`)
    if (limited) return limited

    const schoolId = await getAdminSchoolId(session.user.id)
    if (!schoolId) return NextResponse.json({ message: "School not found" }, { status: 404 })

    const body = await request.json()
    const input = assignTimetableSchema.parse(body)
    const cell = await assignTimetableEntry(schoolId, input)
    return NextResponse.json(cell, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation error" }, { status: 422 })
    }
    if (error instanceof Error && CONFLICT_ERROR_MAP[error.message]) {
      const status = error.message.includes("NOT_FOUND") ? 404 : 409
      return NextResponse.json({ message: CONFLICT_ERROR_MAP[error.message] }, { status })
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "Conflict: a duplicate assignment already exists" }, { status: 409 })
    }
    console.error("[POST /api/timetable]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

// PATCH — Admin updates a timetable entry
export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const limited = await checkRateLimit(writeLimiter, `write:${session.user.id}`)
    if (limited) return limited

    const schoolId = await getAdminSchoolId(session.user.id)
    if (!schoolId) return NextResponse.json({ message: "School not found" }, { status: 404 })

    const body = await request.json()
    const input = updateTimetableSchema.parse(body)
    const cell = await updateTimetableEntry(schoolId, input)
    return NextResponse.json(cell)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation error" }, { status: 422 })
    }
    if (error instanceof Error && CONFLICT_ERROR_MAP[error.message]) {
      const status = error.message.includes("NOT_FOUND") ? 404 : 409
      return NextResponse.json({ message: CONFLICT_ERROR_MAP[error.message] }, { status })
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "Conflict: a duplicate assignment already exists" }, { status: 409 })
    }
    console.error("[PATCH /api/timetable]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

// DELETE — Admin removes a timetable entry
export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const limited = await checkRateLimit(writeLimiter, `write:${session.user.id}`)
    if (limited) return limited

    const schoolId = await getAdminSchoolId(session.user.id)
    if (!schoolId) return NextResponse.json({ message: "School not found" }, { status: 404 })

    const body = await request.json()
    const { id } = deleteTimetableSchema.parse(body)
    await deleteTimetableEntry(schoolId, id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation error" }, { status: 422 })
    }
    if (error instanceof Error && error.message === "ENTRY_NOT_FOUND") {
      return NextResponse.json({ message: "Timetable entry not found" }, { status: 404 })
    }
    console.error("[DELETE /api/timetable]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
