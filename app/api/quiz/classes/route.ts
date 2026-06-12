import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSchoolClassSections } from "@/services/quiz.service"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || !["TEACHER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const classes = await getSchoolClassSections(session.user.id, session.user.role)
    return NextResponse.json(classes)
  } catch (error) {
    console.error("GET /api/quiz/classes error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
