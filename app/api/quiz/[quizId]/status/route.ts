import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { updateQuizStatusSchema } from "@/schemas/quiz.schema"
import { updateQuizStatus } from "@/services/quiz.service"

interface RouteParams {
  params: Promise<{ quizId: string }>
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id || !["TEACHER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { quizId } = await params
    const body = await request.json()
    const { status } = updateQuizStatusSchema.parse(body)
    const result = await updateQuizStatus(quizId, session.user.id, session.user.role, status)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation error" }, { status: 422 })
    }
    if (error instanceof Error) {
      const map: Record<string, number> = {
        QUIZ_NOT_FOUND: 404,
        FORBIDDEN: 403,
        INVALID_STATUS_TRANSITION: 409,
        QUIZ_WINDOW_EXPIRED: 409,
      }
      const status = map[error.message]
      if (status) return NextResponse.json({ message: error.message }, { status })
    }
    console.error("PATCH /api/quiz/[quizId]/status error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
