import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { createGroupSchema } from "@/schemas/timetable-group.schema"
import {
  createGroup,
  getGroupsForSchool,
} from "@/services/timetable-group.service"
import { getAdminSchoolId } from "@/services/timetable.service"
import { writeLimiter, checkRateLimit } from "@/lib/rate-limit"

const ERROR_STATUS: Record<string, number> = {
  GROUP_NAME_TAKEN: 409,
  CLASS_ALREADY_IN_GROUP: 409,
}

const ERROR_MESSAGE: Record<string, string> = {
  GROUP_NAME_TAKEN: "A timetable group with this name already exists",
  CLASS_ALREADY_IN_GROUP: "One or more of these classes already belong to another group",
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
    const schoolId = await getAdminSchoolId(session.user.id)
    if (!schoolId) return NextResponse.json({ message: "School not found" }, { status: 404 })

    const groups = await getGroupsForSchool(schoolId)
    return NextResponse.json(groups)
  } catch (error) {
    console.error("[GET /api/timetable-groups]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
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
    const input = createGroupSchema.parse(body)
    const group = await createGroup(schoolId, input)
    return NextResponse.json(group, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Validation error" },
        { status: 422 },
      )
    }
    if (error instanceof Error && ERROR_STATUS[error.message]) {
      const extra =
        error.message === "CLASS_ALREADY_IN_GROUP"
          ? { conflicts: (error as { conflicts?: unknown }).conflicts }
          : {}
      return NextResponse.json(
        { message: ERROR_MESSAGE[error.message], ...extra },
        { status: ERROR_STATUS[error.message] },
      )
    }
    console.error("[POST /api/timetable-groups]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
