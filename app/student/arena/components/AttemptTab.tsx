"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "motion/react"
import { Clock, Swords, Lock, CheckCircle2, ChevronRight } from "lucide-react"
import { QuizResultModal } from "./QuizResultModal"
import { DashboardLevelCard } from "./DashboardLevelCard"
import { SUBJECT_GROUP_LABELS, type SubjectGroup } from "@/schemas/quiz.schema"
import { subjectGroupColor, subjectGroupIcon } from "@/lib/arena-visuals"

type EffectiveStatus = "UPCOMING" | "LIVE" | "ENDED"

interface QuizAttempt {
  id: string
  status: string
  score: number | null
  submitted_at: string | null
}

interface Quiz {
  id: string
  title: string
  subject: string
  subject_group?: SubjectGroup
  class: string
  section: string
  total_marks: number
  start_time: string
  end_time: string
  effectiveStatus: EffectiveStatus
  _count: { questions: number }
  attempt: QuizAttempt | null
}

function hideOnError(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = "none"
}

function useCountdown(targetTime: string) {
  const [label, setLabel] = useState("")

  useEffect(() => {
    function update() {
      const diff = new Date(targetTime).getTime() - Date.now()
      if (diff <= 0) { setLabel("—"); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      if (h > 0) setLabel(`${h}h ${m}m`)
      else if (m > 0) setLabel(`${m}m ${s}s`)
      else setLabel(`${s}s`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [targetTime])

  return label
}

/** Subject-group-themed challenge card (live = startable, upcoming = locked). */
function ChallengeCard({ quiz, onEnter }: { quiz: Quiz; onEnter: (id: string) => void }) {
  const isLive = quiz.effectiveStatus === "LIVE"
  const countdown = useCountdown(isLive ? quiz.end_time : quiz.start_time)
  const attempted = !!quiz.attempt && quiz.attempt.status !== "IN_PROGRESS"
  const inProgress = quiz.attempt?.status === "IN_PROGRESS"

  const color = subjectGroupColor(quiz.subject_group)
  const icon = subjectGroupIcon(quiz.subject_group)
  const durationMin = Math.max(
    1,
    Math.round((new Date(quiz.end_time).getTime() - new Date(quiz.start_time).getTime()) / 60000)
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 space-y-3 border"
      style={{
        background: `linear-gradient(135deg, ${color}1A, #121826 70%)`,
        borderColor: `${color}40`,
      }}
    >
      <div className="flex items-start gap-3">
        {/* Subject-group icon */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}26` }}
        >
          <img src={icon} alt="" onError={hideOnError} className="w-7 h-7 object-contain" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm leading-tight truncate">{quiz.title}</p>
          <p className="text-xs mt-0.5 font-medium" style={{ color }}>
            {quiz.subject_group ? SUBJECT_GROUP_LABELS[quiz.subject_group] : ""}
          </p>
        </div>

        <span className="text-sm font-extrabold flex-shrink-0" style={{ color }}>
          +{quiz.total_marks} XP
        </span>
      </div>

      {/* Meta line */}
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span>{quiz._count.questions} Qs · {durationMin} min</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" style={{ color: isLive ? "#22C55E" : undefined }} />
          {isLive ? `${countdown} left` : `Starts in ${countdown}`}
        </span>
      </div>

      {/* Action */}
      {isLive ? (
        attempted ? (
          <div className="flex items-center gap-2 text-[#22C55E] text-xs">
            <CheckCircle2 className="h-4 w-4" />
            <span>Submitted — {quiz.attempt!.score}/{quiz.total_marks} XP</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onEnter(quiz.id)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: color }}
          >
            <Swords className="h-3.5 w-3.5" />
            {inProgress ? "Resume Challenge" : "Start Challenge"}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )
      ) : (
        <div className="flex items-center gap-2 text-slate-500 text-xs">
          <Lock className="h-3.5 w-3.5" />
          <span>
            Opens at{" "}
            {new Date(quiz.start_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      )}
    </motion.div>
  )
}

export function AttemptTab() {
  const searchParams = useSearchParams()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedResultQuizId, setSelectedResultQuizId] = useState<string | null>(null)

  // Auto-open result modal if ?result=<quizId> is in the URL (set after submission)
  useEffect(() => {
    const resultId = searchParams.get("result")
    if (resultId) setSelectedResultQuizId(resultId)
  }, [searchParams])

  const fetchQuizzes = useCallback(() => {
    fetch("/api/quiz")
      .then((r) => r.json())
      .then((data: Quiz[]) => setQuizzes(data))
      .catch(() => setQuizzes([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchQuizzes()
    const id = setInterval(fetchQuizzes, 60_000)
    return () => clearInterval(id)
  }, [fetchQuizzes])

  const handleEnter = (id: string) => {
    window.location.href = `/student/arena/quiz/${id}`
  }

  // Lifetime XP for the level card — sum of submitted attempt scores (same basis as top bar).
  const totalXp = quizzes.reduce(
    (s, q) => (q.attempt && q.attempt.status !== "IN_PROGRESS" ? s + (q.attempt.score ?? 0) : s),
    0
  )

  // Today's Challenges = live (startable) first, then upcoming (locked).
  const live = quizzes.filter((q) => q.effectiveStatus === "LIVE")
  const upcoming = quizzes.filter((q) => q.effectiveStatus === "UPCOMING")
  const todays = [...live, ...upcoming]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin w-6 h-6 border-2 border-[#3B82F6] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <DashboardLevelCard totalXp={totalXp} />

        <section>
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <img src="/assets/arena/flame.png" alt="" onError={hideOnError} className="h-5 w-5 object-contain" />
            Today&apos;s Challenges
          </h2>

          {todays.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-[#121826] border border-white/5 rounded-2xl">
              <Swords className="h-9 w-9 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No challenges right now.</p>
              <p className="text-xs mt-1">Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todays.map((q) => (
                <ChallengeCard key={q.id} quiz={q} onEnter={handleEnter} />
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedResultQuizId && (
        <QuizResultModal quizId={selectedResultQuizId} onClose={() => setSelectedResultQuizId(null)} />
      )}
    </>
  )
}
