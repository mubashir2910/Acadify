import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { changeSchoolCodeSchema } from "@/schemas/school-code-change.schema"
import { changeSchoolCode } from "@/services/school.service"
import { feeWriteLimiter, checkRateLimit } from "@/lib/rate-limit"

interface RouteParams {
  params: Promise<{ schoolCode: string }>
}

/**
 * SUPER_ADMIN-only. Rename a school's primary identifier.
 * Requires the caller to echo the current schoolCode in the body as a guard.
 */
export async function POST(req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const { schoolCode: pathSchoolCode } = await params
  const limited = await checkRateLimit(feeWriteLimiter, `change-code:${session.user.id}`)
  if (limited) return limited

  try {
    const body = await req.json()
    const parsed = changeSchoolCodeSchema.parse(body)

    if (parsed.currentSchoolCode.trim() !== pathSchoolCode) {
      return NextResponse.json(
        {
          message:
            "Confirmation code does not match the school being edited. Re-type the current code exactly as shown.",
        },
        { status: 422 },
      )
    }

    const updated = await changeSchoolCode(session.user.id, parsed)
    return NextResponse.json({ message: "School code updated", school: updated })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Invalid input" },
        { status: 422 },
      )
    }
    if (error instanceof Error) {
      if (error.message === "SCHOOL_NOT_FOUND") {
        return NextResponse.json({ message: "School not found" }, { status: 404 })
      }
      if (error.message === "SCHOOL_CODE_UNCHANGED") {
        return NextResponse.json(
          { message: "New code is the same as the current code" },
          { status: 422 },
        )
      }
      if (error.message === "SCHOOL_CODE_EXISTS") {
        return NextResponse.json(
          { message: "Another school already uses that code" },
          { status: 409 },
        )
      }
    }
    console.error("[POST change-code]", error)
    return NextResponse.json({ message: "Failed to update school code" }, { status: 500 })
  }
}
