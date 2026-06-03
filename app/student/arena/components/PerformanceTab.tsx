"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Trophy, CheckCircle2, XCircle, Clock, TrendingUp, Target } from "lucide-react"
import { QuizDetailModal } from "./QuizDetailModal"

interface QuizAttempt {
  id: string
  status: string
  score: number | null
  started_at: string
  submitted_at: string | null
}

interface Quiz {
  id: string
  title: string
  subject: string
  total_marks: number
  start_time: string
  effectiveStatus: string
  attempt: QuizAttempt | null
}

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className={`bg-[#121826] border border-white/5 rounded-xl p-4 flex items-center gap-3`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold text-white">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  )
}

export function PerformanceTab() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDetailQuizId, setSelectedDetailQuizId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/quiz")
      .then((r) => r.json())
      .then((data: Quiz[]) => setQuizzes(data))
      .catch(() => setQuizzes([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin w-6 h-6 border-2 border-[#3B82F6] border-t-transparent rounded-full" />
      </div>
    )
  }

  const attempted = quizzes.filter(
    (q) => q.attempt && q.attempt.status !== "IN_PROGRESS"
  )

  const totalPointsEarned = attempted.reduce((s, q) => s + (q.attempt?.score ?? 0), 0)
  const totalMaxPoints = attempted.reduce((s, q) => s + q.total_marks, 0)
  const accuracy = totalMaxPoints > 0 ? Math.round((totalPointsEarned / totalMaxPoints) * 100) : 0

  // Chart data: most recent 8 contests
  const chartData = attempted
    .slice(-8)
    .map((q) => ({
      name: q.title.length > 10 ? q.title.slice(0, 10) + "…" : q.title,
      score: q.attempt?.score ?? 0,
      max: q.total_marks,
      pct: q.total_marks > 0 ? Math.round(((q.attempt?.score ?? 0) / q.total_marks) * 100) : 0,
    }))

  if (attempted.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No completed contests yet.</p>
        <p className="text-xs mt-1">Your performance stats will appear here after your first contest.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Total Points"
          value={totalPointsEarned}
          icon={<Trophy className="h-5 w-5 text-[#FACC15]" />}
          color="bg-[#FACC15]/10"
        />
        <StatCard
          label="Contests Done"
          value={attempted.length}
          icon={<CheckCircle2 className="h-5 w-5 text-[#22C55E]" />}
          color="bg-[#22C55E]/10"
        />
        <StatCard
          label="Accuracy"
          value={`${accuracy}%`}
          icon={<TrendingUp className="h-5 w-5 text-[#3B82F6]" />}
          color="bg-[#3B82F6]/10"
        />
        <StatCard
          label="Avg Score"
          value={`${totalMaxPoints > 0 ? Math.round((totalPointsEarned / totalMaxPoints) * 100) : 0}%`}
          icon={<Target className="h-5 w-5 text-[#22D3EE]" />}
          color="bg-[#22D3EE]/10"
        />
      </div>

      {/* Score chart */}
      {chartData.length > 1 && (
        <div className="bg-[#121826] border border-white/5 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Score Trend</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#121826", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#fff" }}
                formatter={(val: number) => [`${val} pts`, "Score"]}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.pct >= 80 ? "#22C55E" : entry.pct >= 50 ? "#3B82F6" : "#EF4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per-quiz list */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Contest History</p>
        {[...attempted].reverse().map((q) => {
          const score = q.attempt?.score ?? 0
          const pct = q.total_marks > 0 ? Math.round((score / q.total_marks) * 100) : 0
          const timeMs =
            q.attempt?.submitted_at && q.attempt?.started_at
              ? new Date(q.attempt.submitted_at).getTime() - new Date(q.attempt.started_at).getTime()
              : null
          const timeFmt = timeMs
            ? `${Math.floor(timeMs / 60000)}m ${Math.floor((timeMs % 60000) / 1000)}s`
            : null

          return (
            <div key={q.id} onClick={() => setSelectedDetailQuizId(q.id)} className="bg-[#121826] border border-white/[0.05] rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-[#1A2236] transition-colors">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                pct >= 80 ? "bg-[#22C55E]/20 text-[#22C55E]" :
                pct >= 50 ? "bg-[#3B82F6]/20 text-[#3B82F6]" :
                "bg-[#EF4444]/20 text-[#EF4444]"
              }`}>
                {pct}%
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{q.title}</p>
                <p className="text-xs text-slate-500">{q.subject}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-white">{score}<span className="text-slate-500 text-xs">/{q.total_marks}</span></p>
                {timeFmt && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 justify-end">
                    <Clock className="h-3 w-3" />{timeFmt}
                  </p>
                )}
              </div>
              {q.attempt?.status === "AUTO_SUBMITTED" && (
                <XCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" title="Auto-submitted" />
              )}
            </div>
          )
        })}
      </div>

      {selectedDetailQuizId && (
        <QuizDetailModal
          quizId={selectedDetailQuizId}
          onClose={() => setSelectedDetailQuizId(null)}
        />
      )}
    </div>
  )
}
