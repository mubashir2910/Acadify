import { NextResponse } from "next/server"
import { getTeachersBySchoolCode } from "@/services/teacher.service"

interface RouteParams {
  params: Promise<{ schoolCode: string }>
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { schoolCode } = await params
  try {
    const teachers = await getTeachersBySchoolCode(schoolCode)
    return NextResponse.json(teachers)
  } catch {
    return NextResponse.json({ message: "Failed to fetch teachers" }, { status: 500 })
  }
}
