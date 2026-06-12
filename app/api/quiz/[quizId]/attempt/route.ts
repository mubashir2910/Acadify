import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { saveAnswerSchema } from "@/schemas/quiz.schema"
import { startAttempt, getAttemptState, saveAnswer } from "@/services/quiz-attempt.service"
import { checkRateLimit, quizAttemptLimiter } from "@/lib/rate-limit"

interface RouteParams {
  params: Promise<{ quizId: string }>
}

// Start attempt
export async function POST(_req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const limited = await checkRateLimit(quizAttemptLimiter, `quiz-start:${session.user.id}`)
  if (limited) return limited

  try {
    const { quizId } = await params
    const result = await startAttempt(quizId, session.user.id)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error) {
      const map: Record<string, number> = {
        QUIZ_NOT_FOUND: 404,
        QUIZ_NOT_ACTIVE: 409,
        QUIZ_NOT_STARTED: 409,
        QUIZ_ENDED: 409,
        STUDENT_NOT_FOUND: 404,
        CLASS_MISMATCH: 403,
        ALREADY_SUBMITTED: 409,
      }
      const status = map[error.message]
      if (status) return NextResponse.json({ message: error.message }, { status })
    }
    console.error("POST /api/quiz/[quizId]/attempt error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

// Get attempt state (reconnect)
export async function GET(_req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { quizId } = await params
    const state = await getAttemptState(quizId, session.user.id)
    return NextResponse.json(state)
  } catch (error) {
    if (error instanceof Error && error.message === "ATTEMPT_NOT_FOUND") {
      return NextResponse.json({ message: "Attempt not found" }, { status: 404 })
    }
    console.error("GET /api/quiz/[quizId]/attempt error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

// Save single answer
export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const limited = await checkRateLimit(quizAttemptLimiter, `quiz-save:${session.user.id}`)
  if (limited) return limited

  try {
    const { quizId } = await params
    const body = await request.json()
    const { questionId, givenAnswer } = saveAnswerSchema.parse(body)
    const result = await saveAnswer(quizId, session.user.id, questionId, givenAnswer)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation error" }, { status: 422 })
    }
    if (error instanceof Error) {
      const map: Record<string, number> = {
        ATTEMPT_NOT_FOUND: 404,
        ALREADY_SUBMITTED: 409,
        TIME_EXPIRED: 409,
      }
      const status = map[error.message]
      if (status) return NextResponse.json({ message: error.message }, { status })
    }
    console.error("PATCH /api/quiz/[quizId]/attempt error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
