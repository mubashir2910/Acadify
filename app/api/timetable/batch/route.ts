import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { Prisma } from "@prisma/client"
import { auth } from "@/auth"
import { batchSaveSchema } from "@/schemas/timetable.schema"
import { batchSaveTimetable, getAdminSchoolId } from "@/services/timetable.service"
import { writeLimiter, checkRateLimit } from "@/lib/rate-limit"

const ERROR_STATUS: Record<string, number> = {
  GROUP_NOT_FOUND: 404,
  PERIOD_NOT_FOUND: 404,
  TEACHER_NOT_FOUND: 404,
  ENTRY_NOT_FOUND: 404,
  CLASS_NOT_IN_GROUP: 409,
  TEACHER_CONFLICT: 409,
  CLASS_CONFLICT: 409,
  BREAK_PERIOD_NOT_ASSIGNABLE: 409,
  ASSIGNEE_REQUIRED: 422,
  SLOT_HAS_LOGS: 409,
}

const ERROR_MESSAGE: Record<string, string> = {
  GROUP_NOT_FOUND: "Timetable group not found",
  PERIOD_NOT_FOUND: "One of the periods could not be found",
  TEACHER_NOT_FOUND: "One of the teachers could not be found",
  ENTRY_NOT_FOUND: "One of the assignments was already deleted",
  CLASS_NOT_IN_GROUP: "One of the classes does not belong to this group",
  TEACHER_CONFLICT: "A teacher is double-booked for the same period",
  CLASS_CONFLICT: "A class has two subjects scheduled in the same period",
  BREAK_PERIOD_NOT_ASSIGNABLE: "Cannot assign a subject to a break period",
  ASSIGNEE_REQUIRED: "Each change must include either teacher_id or admin_user_id",
  SLOT_HAS_LOGS: "Cannot remove a slot that has class logs recorded against it",
}

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
    const input = batchSaveSchema.parse(body)
    const result = await batchSaveTimetable(schoolId, input.group_id, input.changes)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Validation error" },
        { status: 422 },
      )
    }
    if (error instanceof Error && ERROR_STATUS[error.message]) {
      return NextResponse.json(
        { message: ERROR_MESSAGE[error.message] },
        { status: ERROR_STATUS[error.message] },
      )
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { message: "Conflict: a duplicate assignment already exists" },
        { status: 409 },
      )
    }
    console.error("[POST /api/timetable/batch]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
