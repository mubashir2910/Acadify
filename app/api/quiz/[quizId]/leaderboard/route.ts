import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getQuizLeaderboard } from "@/services/quiz.service"

interface RouteParams {
  params: Promise<{ quizId: string }>
}

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id || !["TEACHER", "ADMIN", "STUDENT"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { quizId } = await params
    const leaderboard = await getQuizLeaderboard(quizId, session.user.id, session.user.role)
    return NextResponse.json(leaderboard)
  } catch (error) {
    if (error instanceof Error) {
      const map: Record<string, number> = {
        QUIZ_NOT_FOUND: 404,
        FORBIDDEN: 403,
        NOT_SUBMITTED: 403,
      }
      const status = map[error.message]
      if (status) return NextResponse.json({ message: error.message }, { status })
    }
    console.error("GET /api/quiz/[quizId]/leaderboard error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
