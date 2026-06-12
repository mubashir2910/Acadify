"use client"

import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { BarChart3, TrendingUp } from "lucide-react"
import { getLevelProgress } from "@/lib/arena-levels"
import { LevelBadge } from "./LevelBadge"
import type { SubjectGroup } from "@/schemas/quiz.schema"

interface SubjectGroupStats {
  subjectGroup: SubjectGroup
  label: string
  attempts: number
  avgScorePct: number
  accuracyPct: number
}

interface StudentProfile {
  lifetime: {
    totalAttempts: number
    totalPoints: number
    accuracyPct: number
  }
  bySubjectGroup: SubjectGroupStats[]
}

interface LeaderboardEntry {
  rank: number
  isCurrentUser?: boolean
}

// Palette for subject-strength bars, applied by strength rank (strongest first).
const STRENGTH_COLORS = ["#22C55E", "#3B82F6", "#FACC15", "#A855F7", "#22D3EE", "#FB923C", "#F472B6", "#94A3B8"]

interface StatCardProps {
  label: string
  value: string | number
  /** Image path under /assets/arena/ */
  icon: string
  /** Hex accent color for the value text */
  color: string
}

function hideOnError(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = "none"
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-[#121826] border border-white/5 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <img src={icon} alt="" onError={hideOnError} className="w-8 h-8 object-contain flex-shrink-0" />
        <p className="text-2xl font-extrabold leading-none" style={{ color }}>{value}</p>
      </div>
      <p className="text-xs text-slate-400 mt-2">{label}</p>
    </div>
  )
}

export function StatisticsTab() {
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [rank, setRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/arena/student-profile").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/arena/leaderboard?type=accumulated").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([profileData, lbData]) => {
        if (profileData) setProfile(profileData)
        const me = (lbData?.leaderboard as LeaderboardEntry[] | undefined)?.find((e) => e.isCurrentUser)
        setRank(me?.rank ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4" aria-busy>
        <div className="h-36 rounded-2xl bg-white/5 animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
        <div className="h-40 rounded-xl bg-white/5 animate-pulse" />
      </div>
    )
  }

  const totalXp = profile?.lifetime.totalPoints ?? 0
  const contests = profile?.lifetime.totalAttempts ?? 0
  const accuracy = Math.round(profile?.lifetime.accuracyPct ?? 0)
  const lvl = getLevelProgress(totalXp)

  // Subject strengths ranked strongest-first (avg score %), groups actually played.
  const strengths = (profile?.bySubjectGroup ?? [])
    .filter((g) => g.attempts > 0)
    .sort((a, b) => b.avgScorePct - a.avgScorePct)

  return (
    <div className="space-y-5">
      {/* ── Level hero card ── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A2236] to-[#121826] p-5">
        <div className="absolute -right-6 -top-6 opacity-10">
          <BarChart3 className="h-28 w-28 text-[#3B82F6]" />
        </div>

        <div className="relative flex items-center gap-4">
          {/* Shield badge */}
          <LevelBadge level={lvl.level} size={64} />

          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-slate-400">Level {lvl.level}</p>
            <p className="text-xl font-bold text-white leading-tight">{lvl.title}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {lvl.isMax ? `${totalXp} XP · Max level reached` : `${lvl.xpIntoLevel} / ${lvl.xpForLevel} XP this level`}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative mt-4">
          <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${lvl.progressPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#22D3EE]"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {lvl.isMax ? (
              <span className="text-[#22D3EE] font-medium">You&apos;ve reached the top — Legend status! 🏆</span>
            ) : (
              <>
                <span className="text-white font-semibold">{lvl.xpToNext} XP</span> to {lvl.nextTitle}
              </>
            )}
          </p>
        </div>
      </div>

      {/* ── Stat grid ── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Current Rank"
          value={rank ? `#${rank}` : "—"}
          icon="/assets/arena/rank.png"
          color="#FACC15"
        />
        <StatCard
          label="Total XP"
          value={totalXp}
          icon="/assets/arena/star.png"
          color="#22D3EE"
        />
        <StatCard
          label="Contests"
          value={contests}
          icon="/assets/arena/contest.png"
          color="#3B82F6"
        />
        <StatCard
          label="Accuracy"
          value={`${accuracy}%`}
          icon="/assets/arena/accuracy.png"
          color="#22C55E"
        />
      </div>

      {/* ── Subject strength ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-[#3B82F6]" /> Subject Strength
        </p>

        {strengths.length === 0 ? (
          <div className="text-center py-8 text-slate-500 bg-[#121826] border border-white/5 rounded-xl">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Play contests to build your strengths.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {strengths.map((g, i) => {
              const color = STRENGTH_COLORS[i % STRENGTH_COLORS.length]
              const value = Math.round(g.avgScorePct)
              return (
                <div key={g.subjectGroup}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-slate-200">{g.label}</span>
                    <span className="text-sm font-semibold" style={{ color }}>
                      {value}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${value}%` }}
                      transition={{ duration: 0.7, ease: "easeOut", delay: i * 0.05 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
