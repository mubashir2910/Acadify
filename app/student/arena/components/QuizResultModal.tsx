"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { motion } from "motion/react"
import { Clock, Crown, ArrowLeft } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getLevelProgress } from "@/lib/arena-levels"
import { QuizDetailModal } from "./QuizDetailModal"
import { ArenaSpinner } from "./ArenaSpinner"

interface QuestionResult {
  studentAnswer: { isCorrect: boolean }
}

interface QuizResult {
  title: string
  score: number
  status: string
  questions: QuestionResult[]
}

interface LeaderboardEntry {
  rank: number
  name: string
  score: number
  totalMarks: number
  timeTakenMs: number | null
  avatarUrl?: string | null
  isCurrentUser?: boolean
}

// Medal artwork for the top 3 ranks (gold / silver / bronze)
const RANK_MEDAL: Record<number, string> = {
  1: "/assets/arena/rank-1.png",
  2: "/assets/arena/rank-2.png",
  3: "/assets/arena/rank-3.png",
}

// Static confetti burst — deterministic so it never re-randomizes on re-render.
const CONFETTI = [
  { x: -130, y: 90, r: -60, c: "#FACC15", d: 0 },
  { x: -90, y: 160, r: 40, c: "#22D3EE", d: 0.05 },
  { x: -50, y: 60, r: 120, c: "#A855F7", d: 0.1 },
  { x: -20, y: 180, r: -30, c: "#22C55E", d: 0.15 },
  { x: 20, y: 70, r: 80, c: "#FB923C", d: 0.08 },
  { x: 55, y: 165, r: -90, c: "#F472B6", d: 0.12 },
  { x: 95, y: 95, r: 50, c: "#3B82F6", d: 0.04 },
  { x: 135, y: 150, r: -45, c: "#FACC15", d: 0.16 },
  { x: -160, y: 40, r: 25, c: "#22C55E", d: 0.2 },
  { x: 160, y: 50, r: -110, c: "#A855F7", d: 0.18 },
  { x: -110, y: 210, r: 70, c: "#22D3EE", d: 0.22 },
  { x: 110, y: 205, r: -25, c: "#FB923C", d: 0.24 },
]

function formatTime(ms: number | null) {
  if (!ms) return "—"
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}m ${s}s`
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

function RowAvatar({ entry }: { entry: LeaderboardEntry }) {
  return (
    <Avatar className="size-7 flex-shrink-0">
      {entry.avatarUrl ? <AvatarImage src={entry.avatarUrl} alt={entry.name} className="object-cover" /> : null}
      <AvatarFallback className="bg-[#1A2236] text-slate-200 text-[10px] font-semibold">
        {getInitials(entry.name)}
      </AvatarFallback>
    </Avatar>
  )
}

function StatCard({ value, label, color }: { value: React.ReactNode; label: string; color: string }) {
  return (
    <div className="bg-[#121826] border border-white/[0.06] rounded-2xl py-4 px-2 text-center">
      <p className="text-xl font-extrabold" style={{ color }}>{value}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
    </div>
  )
}

interface QuizResultModalProps {
  quizId: string
  onClose: () => void
}

export function QuizResultModal({ quizId, onClose }: QuizResultModalProps) {
  const [result, setResult] = useState<QuizResult | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [totalXp, setTotalXp] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviewOpen, setReviewOpen] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/quiz/${quizId}/result`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/quiz/${quizId}/leaderboard`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/arena/student-profile`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([resultData, lbData, profileData]) => {
        if (resultData) setResult(resultData)
        setLeaderboard(Array.isArray(lbData) ? lbData : [])
        setTotalXp(profileData?.lifetime?.totalPoints ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [quizId])

  const { xpEarned, correct, total, accuracy } = useMemo(() => {
    const qs = result?.questions ?? []
    const correctCount = qs.filter((q) => q.studentAnswer?.isCorrect).length
    return {
      xpEarned: result?.score ?? 0,
      correct: correctCount,
      total: qs.length,
      accuracy: qs.length > 0 ? Math.round((correctCount / qs.length) * 100) : 0,
    }
  }, [result])

  const myRank = leaderboard.find((e) => e.isCurrentUser)?.rank ?? null
  const lvl = getLevelProgress(totalXp ?? 0)

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0F1A] text-white flex flex-col">
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <ArenaSpinner size="lg" tagline="Calculating your Score" />
        </div>
      ) : (
        <>
          {/* ── Back button (closes the result, same as Continue) ── */}
          <div className="shrink-0 px-4 pt-4 pb-1">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          </div>

          {/* ── Scrollable content ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex-1 overflow-y-auto px-5 pt-2 pb-6"
          >
            {/* Trophy + confetti */}
            <div className="relative flex justify-center mt-6 mb-4">
              <div className="pointer-events-none absolute inset-0 overflow-visible">
                {CONFETTI.map((p, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                    animate={{ opacity: [0, 1, 1, 0], x: p.x, y: p.y, scale: 1, rotate: p.r }}
                    transition={{ duration: 1.6, delay: p.d, ease: "easeOut" }}
                    className="absolute left-1/2 top-8 w-2 h-2 rounded-[2px]"
                    style={{ backgroundColor: p.c }}
                  />
                ))}
              </div>
              <motion.div
                initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.05 }}
              >
                <Image
                  src="/assets/arena/trophy.png"
                  alt="Trophy"
                  width={128}
                  height={128}
                  className="drop-shadow-[0_8px_30px_rgba(250,204,21,0.35)]"
                  priority
                />
              </motion.div>
            </div>

            {/* Banner */}
            <div className="flex flex-col items-center gap-3">
              <div className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] shadow-[0_8px_24px_rgba(124,58,237,0.45)]">
                <span className="text-lg font-extrabold text-white">Challenge Complete!</span>
              </div>
              {result?.status === "AUTO_SUBMITTED" && (
                <span className="text-[11px] px-3 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  Auto-submitted when time ran out
                </span>
              )}
            </div>

            {/* +XP */}
            <motion.p
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 14, stiffness: 220, delay: 0.25 }}
              className="text-center text-4xl font-black text-[#FACC15] my-5 drop-shadow-[0_2px_12px_rgba(250,204,21,0.3)]"
            >
              +{xpEarned} XP
            </motion.p>

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard value={`${accuracy}%`} label="Accuracy" color="#22C55E" />
              <StatCard
                value={<>{correct}<span className="text-slate-500 text-base"> / {total}</span></>}
                label="Correct"
                color="#22D3EE"
              />
              <StatCard value={myRank ? `#${myRank}` : "—"} label="Rank" color="#A855F7" />
            </div>

            {/* Level progress */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-white">Level Progress</span>
                <span className="text-xs text-slate-400">
                  {lvl.isMax ? `${lvl.totalXp} XP` : `${lvl.xpIntoLevel} / ${lvl.xpForLevel} XP`}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${lvl.progressPct}%` }}
                  transition={{ duration: 0.9, ease: "easeOut", delay: 0.3 }}
                  className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#7C3AED]"
                />
              </div>
              <p className="text-center text-xs mt-2">
                {lvl.isMax ? (
                  <span className="text-[#22D3EE] font-medium">Max level — Legend! 🏆</span>
                ) : (
                  <>
                    <span className="text-[#FACC15] font-semibold">{lvl.xpToNext} XP</span>
                    <span className="text-slate-400"> to reach {lvl.nextTitle}</span>
                  </>
                )}
              </p>
            </div>

            {/* Class leaderboard */}
            {leaderboard.length > 0 && (
              <div className="mt-7 space-y-3">
                <div className="flex items-center gap-2">
                  <Crown className="h-3.5 w-3.5 text-[#FACC15]" />
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Class Leaderboard</p>
                </div>

                <div className="space-y-2">
                  {leaderboard.map((entry) => {
                    const isMe = !!entry.isCurrentUser
                    return (
                      <div
                        key={`${entry.rank}-${entry.name}`}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border text-sm ${
                          isMe
                            ? "bg-gradient-to-r from-[#7C3AED]/25 to-[#3B82F6]/25 border-[#7C3AED]/50"
                            : entry.rank <= 3
                            ? "bg-[#121826] border-white/5"
                            : "bg-[#0B0F1A] border-white/[0.03]"
                        }`}
                      >
                        <span className="w-7 flex items-center justify-center flex-shrink-0">
                          {entry.rank <= 3 ? (
                            <Image src={RANK_MEDAL[entry.rank]} alt={`Rank ${entry.rank}`} width={22} height={22} />
                          ) : (
                            <span className="text-xs font-mono text-slate-400">#{entry.rank}</span>
                          )}
                        </span>
                        <RowAvatar entry={entry} />
                        <span className={`flex-1 truncate ${isMe ? "text-[#22D3EE] font-semibold" : "text-slate-300"}`}>
                          {isMe ? `You (${entry.name})` : entry.name}
                        </span>
                        <div className="flex items-center gap-3 flex-shrink-0 text-xs text-slate-400">
                          {entry.timeTakenMs && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(entry.timeTakenMs)}
                            </span>
                          )}
                          <span className="font-semibold text-white">{entry.score} XP</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </motion.div>

          {/* ── Fixed bottom action bar ── */}
          <div className="shrink-0 border-t border-white/10 bg-[#0B0F1A]/95 backdrop-blur-md px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3">
            <button
              type="button"
              onClick={() => setReviewOpen(true)}
              className="flex-1 py-3 rounded-xl border border-white/15 text-sm font-semibold text-slate-200 hover:bg-white/5 transition-colors"
            >
              Review Answers
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] text-sm font-semibold text-white hover:opacity-90 transition-opacity shadow-[0_0_18px_rgba(34,211,238,0.25)]"
            >
              Continue
            </button>
          </div>
        </>
      )}

      {/* Review Answers — per-question breakdown slides up over the result */}
      {reviewOpen && <QuizDetailModal quizId={quizId} onClose={() => setReviewOpen(false)} />}
    </div>
  )
}
