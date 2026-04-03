import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { ZodError } from "zod"
import { studentMonthlyQuerySchema } from "@/schemas/attendance.schema"
import { getStudentMonthlyAttendance } from "@/services/attendance.service"

// GET — Student's monthly attendance calendar data
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "STUDENT") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = studentMonthlyQuerySchema.parse({
      month: searchParams.get("month") ?? "",
    })

    const [yearStr, monthStr] = query.month.split("-")
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)

    const records = await getStudentMonthlyAttendance(session.user.id, year, month)
    return NextResponse.json({ month: query.month, records })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Validation error" },
        { status: 422 }
      )
    }
    console.error("GET /api/attendance/student-monthly error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
