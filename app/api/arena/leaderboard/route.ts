import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { arenaLeaderboardQuerySchema } from "@/schemas/quiz.schema"
import { getMonthlyLeaderboard, getAccumulatedLeaderboard } from "@/services/quiz.service"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const query = arenaLeaderboardQuerySchema.parse({
      type: searchParams.get("type"),
      month: searchParams.get("month") ?? undefined,
      class: searchParams.get("class") ?? undefined,
      section: searchParams.get("section") ?? undefined,
    })

    const userId = session.user.id
    const role = session.user.role as string

    const classSection = query.class && query.section
      ? { class: query.class, section: query.section }
      : undefined

    let leaderboard: Awaited<ReturnType<typeof getMonthlyLeaderboard>>

    if (query.type === "monthly") {
      const month = query.month ?? new Date().toISOString().slice(0, 7) // default current month
      leaderboard = await getMonthlyLeaderboard(userId, role, month, classSection)
    } else {
      leaderboard = await getAccumulatedLeaderboard(userId, role, classSection)
    }

    return NextResponse.json({
      leaderboard,
      disclaimer: "If points are equal, ranking is based on total submission speed.",
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 422 })
    }
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR"
    if (msg === "STUDENT_NOT_FOUND" || msg === "TEACHER_NOT_FOUND" || msg === "ADMIN_NOT_FOUND") {
      return NextResponse.json({ error: msg }, { status: 404 })
    }
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("[arena/leaderboard]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
