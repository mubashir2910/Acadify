import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getTeacherClassWithStudents } from "@/services/class-teacher.service"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "TEACHER") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await getTeacherClassWithStudents(session.user.id)
    if (!result) {
      return NextResponse.json({ message: "Teacher not found" }, { status: 404 })
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error("[GET /api/class-teachers/my-class]", error)
    return NextResponse.json(
      { message: "Failed to fetch class data" },
      { status: 500 }
    )
  }
}
