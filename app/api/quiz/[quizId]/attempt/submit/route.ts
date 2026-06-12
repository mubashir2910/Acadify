import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { submitAttempt } from "@/services/quiz-attempt.service"
import { checkRateLimit, quizAttemptLimiter } from "@/lib/rate-limit"

interface RouteParams {
  params: Promise<{ quizId: string }>
}

export async function POST(_req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const limited = await checkRateLimit(quizAttemptLimiter, `quiz-submit:${session.user.id}`)
  if (limited) return limited

  try {
    const { quizId } = await params
    const result = await submitAttempt(quizId, session.user.id)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error) {
      const map: Record<string, number> = {
        ATTEMPT_NOT_FOUND: 404,
        ALREADY_SUBMITTED: 409,
      }
      const status = map[error.message]
      if (status) return NextResponse.json({ message: error.message }, { status })
    }
    console.error("POST /api/quiz/[quizId]/attempt/submit error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
