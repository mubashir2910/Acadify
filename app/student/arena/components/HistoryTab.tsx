"use client"

import { useEffect, useState } from "react"
import { Clock, History as HistoryIcon, Trophy, ListChecks } from "lucide-react"
import { QuizResultModal } from "./QuizResultModal"
import { QuizDetailModal } from "./QuizDetailModal"
import { ArenaSpinner } from "./ArenaSpinner"
import { SUBJECT_GROUP_LABELS, type SubjectGroup } from "@/schemas/quiz.schema"
import { subjectGroupColor, subjectGroupIcon } from "@/lib/arena-visuals"

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
  subject_group?: SubjectGroup
  total_marks: number
  attempt: QuizAttempt | null
}

function hideOnError(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = "none"
}

function formatTime(ms: number | null) {
  if (ms == null) return null
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

export function HistoryTab() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [resultQuizId, setResultQuizId] = useState<string | null>(null)
  const [reviewQuizId, setReviewQuizId] = useState<string | null>(null)

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
        <ArenaSpinner size="md" tagline="Fetching your Battles" />
      </div>
    )
  }

  const attempted = quizzes.filter((q) => q.attempt && q.attempt.status !== "IN_PROGRESS")

  if (attempted.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <HistoryIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No contest history yet.</p>
        <p className="text-xs mt-1">Your attempted contests will appear here.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Past Contests</p>

        {[...attempted].reverse().map((q) => {
          const score = q.attempt?.score ?? 0
          const color = subjectGroupColor(q.subject_group)
          const icon = subjectGroupIcon(q.subject_group)
          const timeMs =
            q.attempt?.submitted_at && q.attempt?.started_at
              ? new Date(q.attempt.submitted_at).getTime() - new Date(q.attempt.started_at).getTime()
              : null
          const timeFmt = formatTime(timeMs)
          const isAuto = q.attempt?.status === "AUTO_SUBMITTED"

          return (
            <div
              key={q.id}
              className="rounded-2xl p-4 border"
              style={{ background: `linear-gradient(135deg, ${color}14, #121826 70%)`, borderColor: `${color}33` }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${color}26` }}
                >
                  <img src={icon} alt="" onError={hideOnError} className="w-6 h-6 object-contain" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-semibold truncate">{q.title}</p>
                  <p className="text-xs mt-0.5 font-medium" style={{ color }}>
                    {q.subject_group ? SUBJECT_GROUP_LABELS[q.subject_group] : ""}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-white">
                    {score}
                    <span className="text-slate-500 text-xs">/{q.total_marks} XP</span>
                  </p>
                  {timeFmt && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 justify-end">
                      <Clock className="h-3 w-3" />
                      {timeFmt}
                    </p>
                  )}
                  {isAuto && <p className="text-[10px] text-amber-500/80 mt-0.5">Auto-submitted</p>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setResultQuizId(q.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] hover:opacity-90 transition-opacity"
                >
                  <Trophy className="h-3.5 w-3.5" /> Review Result
                </button>
                <button
                  type="button"
                  onClick={() => setReviewQuizId(q.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium text-slate-200 border border-white/15 hover:bg-white/5 transition-colors"
                >
                  <ListChecks className="h-3.5 w-3.5" /> Review Answers
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {resultQuizId && <QuizResultModal quizId={resultQuizId} onClose={() => setResultQuizId(null)} />}
      {reviewQuizId && <QuizDetailModal quizId={reviewQuizId} onClose={() => setReviewQuizId(null)} />}
    </>
  )
}
