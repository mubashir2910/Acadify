"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { X, Clock, Trophy, Crown } from "lucide-react"

interface AttemptState {
  score: number
  totalMarks: number
  status: string
}

interface LeaderboardEntry {
  rank: number
  name: string
  score: number
  totalMarks: number
  timeTakenMs: number | null
}

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" }

function formatTime(ms: number | null) {
  if (!ms) return "—"
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}m ${s}s`
}

interface QuizResultModalProps {
  quizId: string
  onClose: () => void
}

export function QuizResultModal({ quizId, onClose }: QuizResultModalProps) {
  const [attempt, setAttempt] = useState<AttemptState | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/quiz/${quizId}/attempt`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/quiz/${quizId}/leaderboard`).then((r) => r.ok ? r.json() : []),
    ])
      .then(([attemptData, lbData]) => {
        if (attemptData) {
          setAttempt({
            score: attemptData.score ?? 0,
            totalMarks: attemptData.totalMarks ?? 0,
            status: attemptData.status ?? "",
          })
        }
        setLeaderboard(Array.isArray(lbData) ? lbData : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [quizId])

  const pct = attempt && attempt.totalMarks > 0
    ? Math.round((attempt.score / attempt.totalMarks) * 100)
    : 0

  const myRank = attempt
    ? leaderboard.find((e) => e.score === attempt.score)?.rank
    : null

  // SVG circle progress
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const strokeDash = circumference - (pct / 100) * circumference
  const strokeColor = pct >= 80 ? "#22C55E" : pct >= 50 ? "#3B82F6" : "#EF4444"

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#0B0F1A] border border-white/10 rounded-t-3xl max-h-[90vh] overflow-y-auto"
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[#FACC15]" />
              <p className="font-semibold text-white text-sm">Contest Result</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin w-6 h-6 border-2 border-[#3B82F6] border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="px-5 py-5 space-y-6">
              {/* Score ring */}
              {attempt && (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative w-28 h-28">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r={radius} fill="none" stroke="#1A2236" strokeWidth="10" />
                      <circle
                        cx="50" cy="50" r={radius}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDash}
                        className="transition-all duration-700"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-white">{pct}%</span>
                      <span className="text-xs text-slate-400">{attempt.score}/{attempt.totalMarks}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {myRank && (
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                        myRank === 1 ? "bg-[#FACC15]/20 text-[#FACC15] border border-[#FACC15]/30" :
                        myRank === 2 ? "bg-slate-500/20 text-slate-300 border border-slate-500/30" :
                        myRank === 3 ? "bg-[#FB923C]/20 text-[#FB923C] border border-[#FB923C]/30" :
                        "bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30"
                      }`}>
                        {myRank <= 3 ? MEDAL[myRank] : null}
                        <span>Rank #{myRank}</span>
                      </div>
                    )}
                    {attempt.status === "AUTO_SUBMITTED" && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-slate-800 text-slate-400 border border-slate-700">
                        Auto-submitted
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Leaderboard */}
              {leaderboard.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Crown className="h-3.5 w-3.5 text-[#FACC15]" />
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Class Leaderboard</p>
                  </div>

                  <div className="space-y-2">
                    {leaderboard.slice(0, 10).map((entry) => {
                      const isMe = attempt && entry.score === attempt.score && entry.rank === myRank
                      return (
                        <div
                          key={`${entry.rank}-${entry.name}`}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border text-sm ${
                            isMe
                              ? "bg-[#3B82F6]/15 border-[#3B82F6]/40"
                              : entry.rank <= 3
                              ? "bg-[#121826] border-white/5"
                              : "bg-[#0B0F1A] border-white/[0.03]"
                          }`}
                        >
                          <span className="w-7 text-center text-xs font-mono flex-shrink-0">
                            {MEDAL[entry.rank] ?? `#${entry.rank}`}
                          </span>
                          <span className={`flex-1 truncate ${isMe ? "text-[#22D3EE] font-semibold" : "text-slate-300"}`}>
                            {entry.name}{isMe ? " (you)" : ""}
                          </span>
                          <div className="flex items-center gap-3 flex-shrink-0 text-xs text-slate-400">
                            {entry.timeTakenMs && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />{formatTime(entry.timeTakenMs)}
                              </span>
                            )}
                            <span className="font-semibold text-white">{entry.score} pts</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
