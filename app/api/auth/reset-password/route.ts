import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { resetPasswordSchema } from "@/schemas/auth.schema"
import { resetPassword } from "@/services/auth.service"
import { authLimiter, getIp, checkRateLimit } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP — the user may not have completed reset yet, so userId is unreliable
    const ip = getIp(req)
    const limited = await checkRateLimit(authLimiter, `reset-pwd:${ip}`)
    if (limited) return limited

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { newPassword } = resetPasswordSchema.parse(body)

    await resetPassword(session.user.id, newPassword)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 422 })
    }
    console.error("[reset-password]", error)
    return NextResponse.json({ message: "Failed to reset password" }, { status: 500 })
  }
}
