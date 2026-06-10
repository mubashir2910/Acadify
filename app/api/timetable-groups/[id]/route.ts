import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { updateGroupSchema } from "@/schemas/timetable-group.schema"
import { deleteGroup, updateGroup } from "@/services/timetable-group.service"
import { getAdminSchoolId } from "@/services/timetable.service"
import { writeLimiter, checkRateLimit } from "@/lib/rate-limit"

const ERROR_STATUS: Record<string, number> = {
  GROUP_NOT_FOUND: 404,
  GROUP_NAME_TAKEN: 409,
  CLASS_NOT_IN_GROUP: 409,
  CLASS_HAS_ENTRIES: 409,
  CLASS_ALREADY_IN_GROUP: 409,
}

const ERROR_MESSAGE: Record<string, string> = {
  GROUP_NOT_FOUND: "Timetable group not found",
  GROUP_NAME_TAKEN: "A timetable group with this name already exists",
  CLASS_NOT_IN_GROUP: "One of the classes you tried to remove isn't in this group",
  CLASS_HAS_ENTRIES:
    "A class still has timetable assignments. Clear them from the grid first.",
  CLASS_ALREADY_IN_GROUP: "One or more classes already belong to another group",
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
    const limited = await checkRateLimit(writeLimiter, `write:${session.user.id}`)
    if (limited) return limited

    const schoolId = await getAdminSchoolId(session.user.id)
    if (!schoolId) return NextResponse.json({ message: "School not found" }, { status: 404 })

    const { id } = await params
    const body = await request.json()
    const input = updateGroupSchema.parse(body)
    const group = await updateGroup(schoolId, id, input)
    return NextResponse.json(group)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Validation error" },
        { status: 422 },
      )
    }
    if (error instanceof Error && ERROR_STATUS[error.message]) {
      // Surface the offending class so the modal can highlight it.
      const offending = (error as { offendingClass?: unknown; conflicts?: unknown })
      const body: Record<string, unknown> = {
        message: ERROR_MESSAGE[error.message],
      }
      if (offending.offendingClass) body.offendingClass = offending.offendingClass
      if (offending.conflicts) body.conflicts = offending.conflicts
      return NextResponse.json(body, { status: ERROR_STATUS[error.message] })
    }
    console.error("[PATCH /api/timetable-groups/:id]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
    const limited = await checkRateLimit(writeLimiter, `write:${session.user.id}`)
    if (limited) return limited

    const schoolId = await getAdminSchoolId(session.user.id)
    if (!schoolId) return NextResponse.json({ message: "School not found" }, { status: 404 })

    const { id } = await params
    await deleteGroup(schoolId, id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof Error && ERROR_STATUS[error.message]) {
      return NextResponse.json(
        { message: ERROR_MESSAGE[error.message] },
        { status: ERROR_STATUS[error.message] },
      )
    }
    console.error("[DELETE /api/timetable-groups/:id]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
