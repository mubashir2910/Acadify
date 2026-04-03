import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { adminResetUserPassword } from "@/services/auth.service"
import { writeLimiter, checkRateLimit } from "@/lib/rate-limit"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const limited = await checkRateLimit(writeLimiter, `write:${session.user.id}`)
  if (limited) return limited

  const { userId } = await params

  try {
    const temporaryPassword = await adminResetUserPassword(session.user.id, userId)
    return NextResponse.json({ temporaryPassword })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "USER_NOT_IN_SCHOOL") {
        return NextResponse.json({ message: "User does not belong to your school" }, { status: 403 })
      }
      if (error.message === "ADMIN_SCHOOL_NOT_FOUND") {
        return NextResponse.json({ message: "Your school could not be resolved" }, { status: 403 })
      }
    }
    console.error("[POST /api/users/[userId]/reset-password]", error)
    return NextResponse.json({ message: "Failed to reset password" }, { status: 500 })
  }
}
