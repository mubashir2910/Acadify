import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAdminLeaderboardOverview } from "@/services/quiz.service"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const data = await getAdminLeaderboardOverview(session.user.id)
    return NextResponse.json(data)
  } catch (error) {
    console.error("GET /api/quiz/leaderboard error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
