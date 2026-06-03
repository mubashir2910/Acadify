"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Star } from "lucide-react"
import { ArenaLoader } from "./components/ArenaLoader"
import { ArenaBottomNav, type ArenaTab } from "./components/ArenaBottomNav"
import { AttemptTab } from "./components/AttemptTab"
import { PerformanceTab } from "./components/PerformanceTab"
import { LeaderboardTab } from "./components/LeaderboardTab"

export default function ArenaPage() {
  const [activeTab, setActiveTab] = useState<ArenaTab>("attempt")
  const [totalPoints, setTotalPoints] = useState<number | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const router = useRouter()

  // Fetch student's accumulated total points for the top bar
  useEffect(() => {
    fetch("/api/arena/leaderboard?type=accumulated")
      .then((r) => r.json())
      .then((data) => {
        // Find this student in the leaderboard — we just need the total
        fetch("/api/quiz")
          .then((r2) => r2.json())
          .then((quizzes: Array<{ attempt: { score: number | null } | null }>) => {
            const pts = quizzes.reduce((s, q) => {
              if (q.attempt && q.attempt.status !== "IN_PROGRESS") {
                return s + (q.attempt.score ?? 0)
              }
              return s
            }, 0)
            setTotalPoints(pts)
          })
          .catch(() => setTotalPoints(0))
      })
      .catch(() => setTotalPoints(0))
      .finally(() => setTimeout(() => setInitialLoading(false), 1200)) // min loader time for UX
  }, [])

  if (initialLoading) {
    return <ArenaLoader />
  }

  const TAB_TITLES: Record<ArenaTab, string> = {
    attempt: "ARENA",
    performance: "MY PERFORMANCE",
    leaderboard: "LEADERBOARD",
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0B0F1A]/95 backdrop-blur-md">
        <button
          onClick={() => router.push("/student")}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        <div className="text-center">
          <p className="text-xs font-bold tracking-widest text-white">
            ACADIFY <span className="text-[#22D3EE]">ARENA</span>
          </p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">{TAB_TITLES[activeTab]}</p>
        </div>

        <div className="flex items-center gap-1.5 text-[#FACC15]">
          <Star className="h-4 w-4 fill-[#FACC15]" />
          <span className="text-sm font-bold">{totalPoints ?? "—"}</span>
        </div>
      </header>

      {/* Tab Content */}
      <main className="flex-1 overflow-y-auto px-4 pt-5 pb-32">
        {activeTab === "attempt" && <AttemptTab />}
        {activeTab === "performance" && <PerformanceTab />}
        {activeTab === "leaderboard" && <LeaderboardTab />}
      </main>

      {/* Bottom Navigation */}
      <ArenaBottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  )
}
