import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { deleteNotification } from "@/services/notifications.service"
import { writeLimiter, checkRateLimit } from "@/lib/rate-limit"

const ERROR_MAP: Record<string, number> = {
  NOTIFICATION_NOT_FOUND: 404,
  FORBIDDEN: 403,
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { role, id: userId } = session.user
    if (!["ADMIN", "TEACHER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const limited = await checkRateLimit(writeLimiter, `write:${userId}`)
    if (limited) return limited

    const { id } = await params
    await deleteNotification(id, userId, role)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (typeof error === "string" && ERROR_MAP[error]) {
      return NextResponse.json({ error }, { status: ERROR_MAP[error] })
    }
    console.error("[DELETE /api/notifications/[id]]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
