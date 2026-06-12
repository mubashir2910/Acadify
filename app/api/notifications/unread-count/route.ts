import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getUnreadCount } from "@/services/notifications.service"
import { expensiveReadLimiter, checkRateLimit } from "@/lib/rate-limit"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { role, id: userId } = session.user
    if (!["ADMIN", "TEACHER", "STUDENT"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const limited = await checkRateLimit(expensiveReadLimiter, `read:${userId}`)
    if (limited) return limited

    const count = await getUnreadCount(userId, role)
    return NextResponse.json({ count })
  } catch (error) {
    console.error("[GET /api/notifications/unread-count]", error)
    // Return 0 on error so the badge never breaks the UI
    return NextResponse.json({ count: 0 })
  }
}
