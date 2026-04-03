import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { markAsRead } from "@/services/notifications.service"

const ERROR_MAP: Record<string, number> = {
  NOTIFICATION_NOT_FOUND: 404,
  SCHOOL_NOT_FOUND: 404,
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { role, id: userId } = session.user
    if (!["ADMIN", "TEACHER", "STUDENT"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    await markAsRead(id, userId, role)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (typeof error === "string" && ERROR_MAP[error]) {
      return NextResponse.json({ error }, { status: ERROR_MAP[error] })
    }
    console.error("[PATCH /api/notifications/[id]/read]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
