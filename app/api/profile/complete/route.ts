import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import {
  completeStudentProfile,
  completeTeacherProfile,
  completeAdminProfile,
} from "@/services/profile.service"
import {
  studentProfileCompleteSchema,
  teacherProfileCompleteSchema,
  adminProfileCompleteSchema,
} from "@/schemas/profile.schema"
import { writeLimiter, checkRateLimit } from "@/lib/rate-limit"

const ROLES_REQUIRING_PROFILE = ["STUDENT", "TEACHER", "ADMIN"]

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id, role } = session.user

  if (!ROLES_REQUIRING_PROFILE.includes(role)) {
    return NextResponse.json(
      { message: "Profile completion not required for this role" },
      { status: 400 }
    )
  }

  const limited = await checkRateLimit(writeLimiter, `write:${session.user.id}`)
  if (limited) return limited

  try {
    const body = await req.json()

    if (role === "STUDENT") {
      const validated = studentProfileCompleteSchema.parse(body)
      await completeStudentProfile(id, validated)
    } else if (role === "TEACHER") {
      const validated = teacherProfileCompleteSchema.parse(body)
      await completeTeacherProfile(id, validated)
    } else if (role === "ADMIN") {
      const validated = adminProfileCompleteSchema.parse(body)
      await completeAdminProfile(id, validated)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0].message },
        { status: 422 }
      )
    }
    if (error instanceof Error && error.message.includes("already registered")) {
      return NextResponse.json({ message: error.message }, { status: 409 })
    }
    console.error("[POST /api/profile/complete]", error)
    return NextResponse.json(
      { message: "Failed to complete profile" },
      { status: 500 }
    )
  }
}
