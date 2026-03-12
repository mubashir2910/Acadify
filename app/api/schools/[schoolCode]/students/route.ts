import { NextResponse } from "next/server"
import { getStudentsBySchoolCode } from "@/services/student.service"

interface RouteParams {
  params: Promise<{ schoolCode: string }>
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { schoolCode } = await params

  try {
    const students = await getStudentsBySchoolCode(schoolCode)

    if (students === null) {
      return NextResponse.json({ message: "School not found" }, { status: 404 })
    }

    return NextResponse.json(students)
  } catch {
    return NextResponse.json({ message: "Failed to fetch students" }, { status: 500 })
  }
}
