import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAdminSchoolId } from "@/services/attendance.service"
import { getLedgerById } from "@/services/fee-ledger.service"

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const schoolId = await getAdminSchoolId(session.user.id)
  if (!schoolId) return NextResponse.json({ message: "No school assigned" }, { status: 403 })

  const { id } = await ctx.params
  const ledger = await getLedgerById(schoolId, id)
  if (!ledger) return NextResponse.json({ message: "Not found" }, { status: 404 })
  return NextResponse.json(ledger)
}
