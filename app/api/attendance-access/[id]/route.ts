import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { getAdminSchoolId, revokeAttendanceAccess } from "@/services/attendance-access.service"
import { writeLimiter, checkRateLimit } from "@/lib/rate-limit"

const ERROR_STATUS: Record<string, number> = {
  ACCESS_NOT_FOUND: 404,
  NO_SCHOOL:        403,
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const limited = await checkRateLimit(writeLimiter, `write:${session.user.id}`)
  if (limited) return limited

  try {
    const { id } = await params
    z.string().uuid().parse(id)

    const schoolId = await getAdminSchoolId(session.user.id)
    if (!schoolId) return NextResponse.json({ message: "Forbidden" }, { status: 403 })

    await revokeAttendanceAccess(schoolId, id)
    return NextResponse.json({ revoked: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid access ID" }, { status: 422 })
    }
    const msg = error instanceof Error ? error.message : "Unknown error"
    console.error("[DELETE /api/attendance-access/[id]]", error)
    const status = ERROR_STATUS[msg] ?? 500
    return NextResponse.json({ message: msg }, { status })
  }
}
