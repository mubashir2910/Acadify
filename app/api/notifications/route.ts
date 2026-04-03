import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { ZodError } from "zod"
import {
  createNotificationSchema,
  notificationListQuerySchema,
} from "@/schemas/notifications.schema"
import {
  createNotification,
  getNotificationsForUser,
  getNotificationsCreatedByUser,
} from "@/services/notifications.service"
import { writeLimiter, expensiveReadLimiter, checkRateLimit } from "@/lib/rate-limit"

const ERROR_MAP: Record<string, number> = {
  SCHOOL_NOT_FOUND: 404,
  SECTION_WITHOUT_CLASS: 400,
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { role, id: userId } = session.user
    if (!["ADMIN", "TEACHER", "STUDENT"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const limited = await checkRateLimit(expensiveReadLimiter, `read:${userId}`)
    if (limited) return limited

    const { searchParams } = new URL(request.url)
    const query = notificationListQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    })

    const mine = searchParams.get("mine") === "true"
    const result = mine
      ? await getNotificationsCreatedByUser(userId, role, query.page, query.limit)
      : await getNotificationsForUser(userId, role, query.page, query.limit)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 422 })
    }
    if (typeof error === "string" && ERROR_MAP[error]) {
      return NextResponse.json({ error }, { status: ERROR_MAP[error] })
    }
    console.error("[GET /api/notifications]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { role, id: userId } = session.user
    if (!["ADMIN", "TEACHER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const limited = await checkRateLimit(writeLimiter, `write:${userId}`)
    if (limited) return limited

    const body = await request.json()
    const input = createNotificationSchema.parse({
      target_audience: "ALL",
      target_class: null,
      target_section: null,
      ...body,
    })

    const result = await createNotification(userId, role, input)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 422 })
    }
    if (typeof error === "string" && ERROR_MAP[error]) {
      return NextResponse.json({ error }, { status: ERROR_MAP[error] })
    }
    console.error("[POST /api/notifications]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
