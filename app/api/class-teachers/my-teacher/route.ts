import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getStudentClassTeacher } from "@/services/class-teacher.service"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await getStudentClassTeacher(session.user.id)
    if (!result) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 })
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error("[GET /api/class-teachers/my-teacher]", error)
    return NextResponse.json(
      { message: "Failed to fetch class teacher" },
      { status: 500 }
    )
  }
}
