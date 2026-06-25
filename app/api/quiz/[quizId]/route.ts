import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getQuizDetail, deleteQuiz } from "@/services/quiz.service"
import { expensiveReadLimiter, checkRateLimit } from "@/lib/rate-limit"

interface RouteParams {
  params: Promise<{ quizId: string }>
}

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const limited = await checkRateLimit(expensiveReadLimiter, `read:${session.user.id}`)
  if (limited) return limited

  try {
    const { quizId } = await params
    const quiz = await getQuizDetail(quizId, session.user.id, session.user.role)
    return NextResponse.json(quiz)
  } catch (error) {
    if (error instanceof Error && error.message === "QUIZ_NOT_FOUND") {
      return NextResponse.json({ message: "Quiz not found" }, { status: 404 })
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }
    console.error("GET /api/quiz/[quizId] error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id || !["TEACHER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { quizId } = await params
    await deleteQuiz(quizId, session.user.id, session.user.role)
    return NextResponse.json({ message: "Quiz deleted" })
  } catch (error) {
    if (error instanceof Error) {
      const map: Record<string, number> = {
        QUIZ_NOT_FOUND: 404,
        FORBIDDEN: 403,
        CANNOT_DELETE_ACTIVE_QUIZ: 409,
      }
      const status = map[error.message]
      if (status) return NextResponse.json({ message: error.message }, { status })
    }
    console.error("DELETE /api/quiz/[quizId] error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
