import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getStudentQuizResult } from "@/services/quiz.service"

interface RouteParams {
  params: Promise<{ quizId: string }>
}

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { quizId } = await params
    const result = await getStudentQuizResult(quizId, session.user.id)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error) {
      const map: Record<string, number> = {
        NOT_SUBMITTED: 403,
        QUIZ_NOT_FOUND: 404,
      }
      const status = map[error.message]
      if (status) return NextResponse.json({ message: error.message }, { status })
    }
    console.error("GET /api/quiz/[quizId]/result error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
