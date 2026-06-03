import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { getAdminSchoolId } from "@/services/attendance.service"
import {
  deleteFeeStructure,
  getFeeStructure,
  updateFeeStructure,
} from "@/services/fee-structure.service"
import { updateFeeStructureSchema } from "@/schemas/fee-structure.schema"
import { feeWriteLimiter, checkRateLimit } from "@/lib/rate-limit"

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const schoolId = await getAdminSchoolId(session.user.id)
  if (!schoolId) return NextResponse.json({ message: "No school assigned" }, { status: 403 })

  const { id } = await ctx.params
  const structure = await getFeeStructure(schoolId, id)
  if (!structure) return NextResponse.json({ message: "Not found" }, { status: 404 })
  return NextResponse.json(structure)
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const limited = await checkRateLimit(feeWriteLimiter, `fee-write:${session.user.id}`)
  if (limited) return limited

  const schoolId = await getAdminSchoolId(session.user.id)
  if (!schoolId) return NextResponse.json({ message: "No school assigned" }, { status: 403 })

  const { id } = await ctx.params

  try {
    const body = await req.json()
    const validated = updateFeeStructureSchema.parse(body)
    const updated = await updateFeeStructure(schoolId, session.user.id, id, validated)
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 422 })
    }
    if (error instanceof Error && error.message === "STRUCTURE_NOT_FOUND") {
      return NextResponse.json({ message: "Structure not found" }, { status: 404 })
    }
    console.error("[PATCH /api/fees/structures/[id]]", error)
    return NextResponse.json({ message: "Failed to update structure" }, { status: 500 })
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const limited = await checkRateLimit(feeWriteLimiter, `fee-write:${session.user.id}`)
  if (limited) return limited

  const schoolId = await getAdminSchoolId(session.user.id)
  if (!schoolId) return NextResponse.json({ message: "No school assigned" }, { status: 403 })

  const { id } = await ctx.params

  // Body shape: { deleteLedgers: boolean }. Defaults to false (keep ledgers).
  let deleteLedgers = false
  try {
    const body = await req.json().catch(() => ({}))
    deleteLedgers = Boolean(body?.deleteLedgers)
  } catch {
    /* empty body is fine */
  }

  try {
    await deleteFeeStructure(schoolId, session.user.id, id, { deleteLedgers })
    return NextResponse.json({ deleted: true, deletedLedgers: deleteLedgers })
  } catch (error) {
    if (error instanceof Error && error.message === "STRUCTURE_NOT_FOUND") {
      return NextResponse.json({ message: "Structure not found" }, { status: 404 })
    }
    if (
      error instanceof Error &&
      error.message === "STRUCTURE_HAS_PAID_OR_WAIVED_LEDGERS"
    ) {
      return NextResponse.json(
        {
          message:
            "Cannot delete ledger rows that have payments or active waivers. Choose 'Keep ledger rows' instead.",
        },
        { status: 409 },
      )
    }
    console.error("[DELETE /api/fees/structures/[id]]", error)
    return NextResponse.json({ message: "Failed to delete structure" }, { status: 500 })
  }
}
