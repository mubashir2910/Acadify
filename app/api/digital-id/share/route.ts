import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { ensureShareToken, DIGITAL_ID_ROLES } from "@/services/digital-id.service"
import { writeLimiter, checkRateLimit } from "@/lib/rate-limit"

// POST /api/digital-id/share — lazily create the public share token (if needed)
// and return it. The client builds the full URL from its own origin to avoid
// proxy/host mismatches. Sharing is opt-in: the token does not exist until here.
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  if (!DIGITAL_ID_ROLES.includes(session.user.role as (typeof DIGITAL_ID_ROLES)[number])) {
    return NextResponse.json(
      { message: "Digital ID not available for this role" },
      { status: 403 }
    )
  }

  const limited = await checkRateLimit(writeLimiter, `write:${session.user.id}`)
  if (limited) return limited

  try {
    const token = await ensureShareToken(session.user.id)
    return NextResponse.json({ token })
  } catch (error) {
    console.error("[POST /api/digital-id/share]", error)
    return NextResponse.json({ message: "Failed to create share link" }, { status: 500 })
  }
}
