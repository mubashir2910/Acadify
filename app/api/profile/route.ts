import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import {
  getStudentProfile,
  getTeacherProfile,
  getAdminProfile,
  updateStudentProfile,
  updateTeacherProfile,
  updateAdminProfile,
} from "@/services/profile.service"
import { getClassTeacherForStudent } from "@/services/class-teacher.service"
import {
  studentProfileUpdateSchema,
  teacherProfileUpdateSchema,
  adminProfileUpdateSchema,
} from "@/schemas/profile.schema"
import { writeLimiter, checkRateLimit } from "@/lib/rate-limit"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id, role } = session.user

    if (role === "STUDENT") {
      const profile = await getStudentProfile(id)
      if (!profile) {
        return NextResponse.json({ message: "Profile not found" }, { status: 404 })
      }

      // Enrich with class teacher name
      const student = profile.students?.[0]
      let classTeacherName: string | null = null
      if (student) {
        const ct = await getClassTeacherForStudent(
          student.school_id,
          student.class,
          student.section
        )
        classTeacherName = ct?.teacher.user.name ?? null
      }

      return NextResponse.json({ ...profile, classTeacherName })
    }

    if (role === "TEACHER") {
      const profile = await getTeacherProfile(id)
      return profile
        ? NextResponse.json(profile)
        : NextResponse.json({ message: "Profile not found" }, { status: 404 })
    }

    if (role === "ADMIN") {
      const profile = await getAdminProfile(id)
      return profile
        ? NextResponse.json(profile)
        : NextResponse.json({ message: "Profile not found" }, { status: 404 })
    }

    return NextResponse.json(
      { message: "Profile not available for this role" },
      { status: 400 }
    )
  } catch (error) {
    console.error("[GET /api/profile]", error)
    return NextResponse.json(
      { message: "Failed to fetch profile" },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const limited = await checkRateLimit(writeLimiter, `write:${session.user.id}`)
  if (limited) return limited

  try {
    const body = await req.json()
    const { id, role } = session.user

    if (role === "STUDENT") {
      const validated = studentProfileUpdateSchema.parse(body)
      await updateStudentProfile(id, validated)
    } else if (role === "TEACHER") {
      const validated = teacherProfileUpdateSchema.parse(body)
      await updateTeacherProfile(id, validated)
    } else if (role === "ADMIN") {
      const validated = adminProfileUpdateSchema.parse(body)
      await updateAdminProfile(id, validated)
    } else {
      return NextResponse.json(
        { message: "Profile update not available for this role" },
        { status: 403 }
      )
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
    console.error("[PUT /api/profile]", error)
    return NextResponse.json(
      { message: "Failed to update profile" },
      { status: 500 }
    )
  }
}
