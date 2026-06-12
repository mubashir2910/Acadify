import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { createQuizSchema } from "@/schemas/quiz.schema"
import {
  createQuiz,
  getCreatorQuizzes,
  getAdminQuizzes,
  getStudentAvailableQuizzes,
} from "@/services/quiz.service"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id || !["TEACHER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const data = createQuizSchema.parse(body)
    const quiz = await createQuiz(session.user.id, session.user.role, data)
    return NextResponse.json(quiz, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation error" }, { status: 422 })
    }
    if (error instanceof Error) {
      const map: Record<string, number> = {
        TEACHER_NOT_FOUND: 404,
        ADMIN_NOT_FOUND: 404,
        CLASS_SECTION_NOT_FOUND: 422,
        UNAUTHORIZED: 403,
      }
      const status = map[error.message]
      if (status) return NextResponse.json({ message: error.message }, { status })
    }
    console.error("POST /api/quiz error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const role = session.user.role
    const { searchParams } = new URL(request.url)
    const mine = searchParams.get("mine") === "true"

    if (role === "TEACHER") {
      const quizzes = await getCreatorQuizzes(session.user.id)
      return NextResponse.json(quizzes)
    }

    if (role === "ADMIN") {
      // ?mine=true → only contests created by this admin
      const quizzes = mine
        ? await getCreatorQuizzes(session.user.id)
        : await getAdminQuizzes(session.user.id)
      return NextResponse.json(quizzes)
    }

    if (role === "STUDENT") {
      const quizzes = await getStudentAvailableQuizzes(session.user.id)
      return NextResponse.json(quizzes)
    }

    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  } catch (error) {
    console.error("GET /api/quiz error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
