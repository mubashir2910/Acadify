"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { ArenaLoader } from "./components/ArenaLoader"
import { ArenaBottomNav, type ArenaTab } from "./components/ArenaBottomNav"
import { AttemptTab } from "./components/AttemptTab"
import { StatisticsTab } from "./components/StatisticsTab"
import { LeaderboardTab } from "./components/LeaderboardTab"
import { HistoryTab } from "./components/HistoryTab"
import { AchievementsTab } from "./components/AchievementsTab"
import StarBorder from "@/components/ui/star-border"

export default function ArenaPage() {
  const [activeTab, setActiveTab] = useState<ArenaTab>("arena")
  const [totalXp, setTotalXp] = useState<number | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const router = useRouter()

  // Fetch the student's accumulated XP (lifetime contest points) for the top bar.
  useEffect(() => {
    fetch("/api/quiz")
      .then((r) => r.json())
      .then((quizzes: Array<{ attempt: { score: number | null; status: string } | null }>) => {
        const xp = quizzes.reduce((s, q) => {
          if (q.attempt && q.attempt.status !== "IN_PROGRESS") {
            return s + (q.attempt.score ?? 0)
          }
          return s
        }, 0)
        setTotalXp(xp)
      })
      .catch(() => setTotalXp(0))
      .finally(() => setTimeout(() => setInitialLoading(false), 1200)) // min loader time for UX
  }, [])

  if (initialLoading) {
    return <ArenaLoader />
  }

  const TAB_TITLES: Record<ArenaTab, string> = {
    achievements: "ACHIEVEMENTS",
    statistics: "MY STATISTICS",
    arena: "ARENA",
    leaderboard: "LEADERBOARD",
    history: "HISTORY",
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

        <div className="flex items-center gap-2">
          <StarBorder
            as="div"
            color="#FACC15"
            speed="4s"
            thickness={3}
            radius={9999}
            innerClassName="bg-[#0B0F1A] text-[#FACC15] text-sm font-bold px-3 py-1 flex items-center gap-1"
          >
            <span>{totalXp ?? "—"}</span> XP
          </StarBorder>
        </div>
      </header>

      {/* Tab Content */}
      <main className="flex-1 overflow-y-auto px-4 pt-5 pb-32">
        {activeTab === "achievements" && <AchievementsTab />}
        {activeTab === "statistics" && <StatisticsTab />}
        {activeTab === "arena" && <AttemptTab />}
        {activeTab === "leaderboard" && <LeaderboardTab />}
        {activeTab === "history" && <HistoryTab />}
      </main>

      {/* Bottom Navigation */}
      <ArenaBottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  )
}
