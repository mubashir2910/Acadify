"use client"

import { useEffect, useState, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Clock, Star, Crown } from "lucide-react"
import { motion } from "motion/react"

interface LeaderboardEntry {
  rank: number
  name: string
  totalPoints: number
  totalTimeMs: number
}

interface ArenaLeaderboardResponse {
  leaderboard: LeaderboardEntry[]
  disclaimer: string
}

function formatTime(ms: number) {
  if (!ms) return "—"
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}m ${s}s`
}

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" }

function LeaderboardTable({
  data,
  loading,
  disclaimer,
}: {
  data: LeaderboardEntry[]
  loading: boolean
  disclaimer: string
}) {
  if (loading) {
    return (
      <div className="space-y-3" aria-busy>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-[#121826] border border-white/5 rounded-xl p-3 animate-pulse"
          >
            <div className="h-7 w-7 rounded-full bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 bg-white/10 rounded" />
              <div className="h-2.5 w-1/4 bg-white/10 rounded" />
            </div>
            <div className="h-4 w-10 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Trophy className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No data yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Top 3 podium highlight */}
      {data.slice(0, 3).map((entry) => (
        <div
          key={`${entry.rank}-${entry.name}`}
          className={`flex items-center gap-3 rounded-xl p-3 border ${
            entry.rank === 1
              ? "bg-[#FACC15]/10 border-[#FACC15]/30"
              : entry.rank === 2
              ? "bg-slate-500/10 border-slate-500/20"
              : "bg-[#FB923C]/10 border-[#FB923C]/30"
          }`}
        >
          <span className="text-2xl w-8 flex-shrink-0">{MEDAL[entry.rank]}</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm truncate">{entry.name}</p>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <Clock className="h-3 w-3" />
              <span>{formatTime(entry.totalTimeMs)}</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className={`text-lg font-bold ${entry.rank === 1 ? "text-[#FACC15]" : entry.rank === 3 ? "text-[#FB923C]" : "text-white"}`}>
              {entry.totalPoints}
            </p>
            <p className="text-xs text-slate-400">pts</p>
          </div>
        </div>
      ))}

      {/* Remaining entries */}
      {data.slice(3).map((entry) => (
        <div
          key={`${entry.rank}-${entry.name}`}
          className="flex items-center gap-3 bg-[#121826] border border-white/5 rounded-xl p-3"
        >
          <span className="w-8 text-center text-slate-500 text-sm font-mono flex-shrink-0">#{entry.rank}</span>
          <p className="flex-1 text-sm text-slate-300 truncate">{entry.name}</p>
          <div className="flex items-center gap-3 flex-shrink-0 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(entry.totalTimeMs)}</span>
            <span className="font-semibold text-white">{entry.totalPoints} pts</span>
          </div>
        </div>
      ))}

      {/* Disclaimer */}
      <p className="text-xs text-slate-500 text-center pt-1">{disclaimer}</p>
    </div>
  )
}

function PrizesSection({ winner }: { winner?: LeaderboardEntry }) {
  if (!winner) return null

  return (
    <div className="bg-gradient-to-br from-[#FACC15]/10 to-[#FB923C]/10 border border-[#FACC15]/30 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Crown className="h-4 w-4 text-[#FACC15]" />
        <p className="text-xs font-bold uppercase tracking-widest text-[#FACC15]">ACADIFIER OF THE MONTH</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-[#FACC15]/20 flex items-center justify-center text-2xl">🏆</div>
        <div>
          <p className="font-bold text-white">{winner.name}</p>
          <p className="text-xs text-[#FACC15]">{winner.totalPoints} points this month</p>
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-3">
        🏅 Exclusive rewards and performance-based recognition for this month&apos;s top achiever.
      </p>
    </div>
  )
}

export function LeaderboardTab() {
  const currentMonth = new Date().toISOString().slice(0, 7)

  const [monthly, setMonthly] = useState<LeaderboardEntry[]>([])
  const [accumulated, setAccumulated] = useState<LeaderboardEntry[]>([])
  const [disclaimer, setDisclaimer] = useState("")
  const [loadingMonthly, setLoadingMonthly] = useState(true)
  const [loadingAccumulated, setLoadingAccumulated] = useState(true)

  const fetchMonthly = useCallback(() => {
    setLoadingMonthly(true)
    fetch(`/api/arena/leaderboard?type=monthly&month=${currentMonth}`)
      .then((r) => r.json())
      .then((data: ArenaLeaderboardResponse) => {
        setMonthly(data.leaderboard ?? [])
        setDisclaimer(data.disclaimer ?? "")
      })
      .catch(() => setMonthly([]))
      .finally(() => setLoadingMonthly(false))
  }, [currentMonth])

  const fetchAccumulated = useCallback(() => {
    setLoadingAccumulated(true)
    fetch("/api/arena/leaderboard?type=accumulated")
      .then((r) => r.json())
      .then((data: ArenaLeaderboardResponse) => setAccumulated(data.leaderboard ?? []))
      .catch(() => setAccumulated([]))
      .finally(() => setLoadingAccumulated(false))
  }, [])

  useEffect(() => {
    fetchMonthly()
    fetchAccumulated()
  }, [fetchMonthly, fetchAccumulated])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-[#3B82F6]" />
        <p className="text-xs font-semibold uppercase tracking-widest text-[#3B82F6]">Rankings</p>
      </div>

      <Tabs defaultValue="monthly">
        <TabsList className="w-full bg-[#121826] border border-white/10">
          <TabsTrigger value="monthly" className="flex-1 text-xs data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white">
            <Star className="h-3 w-3 mr-1" /> Monthly
          </TabsTrigger>
          <TabsTrigger value="accumulated" className="flex-1 text-xs data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white">
            <Trophy className="h-3 w-3 mr-1" /> All-Time
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="mt-4 space-y-0">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {/* ACADIFIER OF THE MONTH shown above leaderboard */}
            <PrizesSection winner={monthly[0]} />
            <LeaderboardTable data={monthly} loading={loadingMonthly} disclaimer={disclaimer} />
          </motion.div>
        </TabsContent>

        <TabsContent value="accumulated" className="mt-4">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <LeaderboardTable data={accumulated} loading={loadingAccumulated} disclaimer={disclaimer} />
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
