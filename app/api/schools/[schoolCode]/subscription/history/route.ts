import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSubscriptionHistory } from "@/services/school.service"
import { expensiveReadLimiter, checkRateLimit } from "@/lib/rate-limit"

interface RouteParams {
  params: Promise<{ schoolCode: string }>
}

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const limited = await checkRateLimit(expensiveReadLimiter, `read:${session.user.id}`)
  if (limited) return limited

  const { schoolCode } = await params

  try {
    const items = await getSubscriptionHistory(schoolCode)
    return NextResponse.json(items)
  } catch (error) {
    if (error instanceof Error && error.message === "SCHOOL_NOT_FOUND") {
      return NextResponse.json({ message: "School not found" }, { status: 404 })
    }
    console.error("[GET /api/schools/[schoolCode]/subscription/history]", error)
    return NextResponse.json(
      { message: "Failed to fetch history" },
      { status: 500 },
    )
  }
}
