import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { createSchool, getSchools } from "@/services/school.service"
import { createSchoolSchema } from "@/schemas/school.schema"
import { ZodError } from "zod"
import { superAdminWriteLimiter, expensiveReadLimiter, checkRateLimit } from "@/lib/rate-limit"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const limited = await checkRateLimit(superAdminWriteLimiter, `sa-write:${session.user.id}`)
  if (limited) return limited

  try {
    const body = await req.json()
    const validated = createSchoolSchema.parse(body)
    const school = await createSchool(validated)
    return NextResponse.json(school, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 422 })
    }
    return NextResponse.json({ message: "Failed to create school" }, { status: 500 })
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const limited = await checkRateLimit(expensiveReadLimiter, `read:${session.user.id}`)
  if (limited) return limited

  try {
    const schools = await getSchools()
    return NextResponse.json(schools)
  } catch {
    return NextResponse.json({ message: "Failed to fetch schools" }, { status: 500 })
  }
}
