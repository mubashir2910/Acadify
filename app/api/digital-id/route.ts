import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import {
  getDigitalIdCard,
  getDigitalIdPhotoQuota,
  setDigitalIdPhoto,
  DigitalIdLimitError,
  DIGITAL_ID_ROLES,
} from "@/services/digital-id.service"
import { updateDigitalIdSchema } from "@/schemas/digital-id.schema"
import {
  expensiveReadLimiter,
  writeLimiter,
  checkRateLimit,
} from "@/lib/rate-limit"

// GET /api/digital-id — card payload for the logged-in user.
export async function GET() {
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

  const limited = await checkRateLimit(expensiveReadLimiter, `read:${session.user.id}`)
  if (limited) return limited

  try {
    const [card, quota] = await Promise.all([
      getDigitalIdCard(session.user.id),
      getDigitalIdPhotoQuota(session.user.id),
    ])
    if (!card) {
      return NextResponse.json({ message: "Digital ID not found" }, { status: 404 })
    }
    return NextResponse.json({
      ...card,
      photoChangesRemaining: quota.remaining,
      photoChangeLimit: quota.limit,
    })
  } catch (error) {
    console.error("[GET /api/digital-id]", error)
    return NextResponse.json({ message: "Failed to load Digital ID" }, { status: 500 })
  }
}

// PUT /api/digital-id — set or clear the dedicated ID-card photo.
export async function PUT(req: Request) {
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
    const body = await req.json()
    const { digitalIdPhoto } = updateDigitalIdSchema.parse(body)
    await setDigitalIdPhoto(session.user.id, digitalIdPhoto)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 422 })
    }
    if (error instanceof DigitalIdLimitError) {
      return NextResponse.json({ message: error.message }, { status: 429 })
    }
    console.error("[PUT /api/digital-id]", error)
    return NextResponse.json({ message: "Failed to update Digital ID" }, { status: 500 })
  }
}
