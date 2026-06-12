import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { updateSchoolBrandingSchema } from "@/schemas/school.schema"
import { updateSchoolBranding } from "@/services/school.service"
import { feeWriteLimiter, checkRateLimit } from "@/lib/rate-limit"

interface RouteParams {
  params: Promise<{ schoolCode: string }>
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { schoolCode } = await params

  const school = await prisma.school.findUnique({
    where: { schoolCode },
    select: { id: true },
  })
  if (!school) {
    return NextResponse.json({ message: "School not found" }, { status: 404 })
  }

  if (session.user.role !== "SUPER_ADMIN") {
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }
    const membership = await prisma.schoolUser.findFirst({
      where: {
        user_id: session.user.id,
        school_id: school.id,
        role: "ADMIN",
        status: "ACTIVE",
      },
      select: { id: true },
    })
    if (!membership) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }
  }

  const limited = await checkRateLimit(feeWriteLimiter, `branding:${session.user.id}`)
  if (limited) return limited

  try {
    const body = await req.json()
    const parsed = updateSchoolBrandingSchema.parse(body)
    const updated = await updateSchoolBranding(schoolCode, session.user.id, parsed)
    return NextResponse.json({ message: "Branding updated", school: updated })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Invalid input", issues: error.issues },
        { status: 422 },
      )
    }
    if (error instanceof Error && error.message === "SCHOOL_NOT_FOUND") {
      return NextResponse.json({ message: "School not found" }, { status: 404 })
    }
    console.error("[PATCH /api/schools/[schoolCode]/branding]", error)
    return NextResponse.json({ message: "Failed to update branding" }, { status: 500 })
  }
}
