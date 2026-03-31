import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { ZodError } from "zod"
import { updateSessionStartSchema } from "@/schemas/attendance.schema"
import { updateSessionStartDate } from "@/services/school.service"

// PUT — Super admin sets session start date for a school
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ schoolCode: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { schoolCode } = await params
    const body = await request.json()
    const data = updateSessionStartSchema.parse(body)

    await updateSessionStartDate(schoolCode, data.session_started_on)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Validation error" },
        { status: 422 }
      )
    }
    if (error instanceof Error && error.message === "SCHOOL_NOT_FOUND") {
      return NextResponse.json({ message: "School not found" }, { status: 404 })
    }
    console.error("PUT /api/schools/[schoolCode]/session-start error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
