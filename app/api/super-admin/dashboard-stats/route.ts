import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getPlatformStats } from "@/services/school.service"
import { expensiveReadLimiter, checkRateLimit } from "@/lib/rate-limit"

export async function GET() {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const limited = await checkRateLimit(expensiveReadLimiter, `read:${session.user.id}`)
    if (limited) return limited

    try {
        const stats = await getPlatformStats()
        return NextResponse.json(stats)
    } catch {
        return NextResponse.json(
            { message: "Failed to fetch platform stats" },
            { status: 500 }
        )
    }
}
