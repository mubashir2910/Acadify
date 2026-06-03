import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { getAdminSchoolId } from "@/services/attendance.service"
import { createFeeStructure, listFeeStructures } from "@/services/fee-structure.service"
import { createFeeStructureSchema } from "@/schemas/fee-structure.schema"
import { feeWriteLimiter, expensiveReadLimiter, checkRateLimit } from "@/lib/rate-limit"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const limited = await checkRateLimit(expensiveReadLimiter, `read:${session.user.id}`)
  if (limited) return limited

  const schoolId = await getAdminSchoolId(session.user.id)
  if (!schoolId) return NextResponse.json({ message: "No school assigned" }, { status: 403 })

  const url = new URL(req.url)
  const sessionId = url.searchParams.get("sessionId") ?? undefined
  const classFilter = url.searchParams.get("class") ?? undefined
  const includeArchived = url.searchParams.get("includeArchived") === "true"

  try {
    const items = await listFeeStructures(schoolId, {
      sessionId,
      class: classFilter,
      includeArchived,
    })
    return NextResponse.json(items)
  } catch {
    return NextResponse.json({ message: "Failed to fetch structures" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const limited = await checkRateLimit(feeWriteLimiter, `fee-write:${session.user.id}`)
  if (limited) return limited

  const schoolId = await getAdminSchoolId(session.user.id)
  if (!schoolId) return NextResponse.json({ message: "No school assigned" }, { status: 403 })

  try {
    const body = await req.json()
    const validated = createFeeStructureSchema.parse(body)
    const created = await createFeeStructure(schoolId, session.user.id, validated)
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 422 })
    }
    if (error instanceof Error && error.message === "SESSION_NOT_FOUND") {
      return NextResponse.json({ message: "Session not found" }, { status: 404 })
    }
    console.error("[POST /api/fees/structures]", error)
    return NextResponse.json({ message: "Failed to create structure" }, { status: 500 })
  }
}
