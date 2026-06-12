import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { getArenaAvailableMonths } from "@/services/quiz.service"

// Returns the list of months the arena leaderboard can be filtered to —
// anchored to the school's session_started_on (set by SUPER_ADMIN) and walking
// back from the current month. Newest first; element 0 is the current month.
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await getArenaAvailableMonths(
      session.user.id,
      session.user.role as string
    )
    return NextResponse.json(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN"
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (
      msg === "STUDENT_NOT_FOUND" ||
      msg === "TEACHER_NOT_FOUND" ||
      msg === "ADMIN_NOT_FOUND"
    ) {
      return NextResponse.json({ error: msg }, { status: 404 })
    }
    console.error("[arena/months]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
