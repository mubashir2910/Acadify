"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "motion/react"
import { Clock, Swords, Lock, CheckCircle2, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { QuizResultModal } from "./QuizResultModal"

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
  class: string
  section: string
  total_marks: number
  start_time: string
  end_time: string
  effectiveStatus: EffectiveStatus
  _count: { questions: number }
  attempt: QuizAttempt | null
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

function LiveCard({ quiz, onEnter }: { quiz: Quiz; onEnter: (id: string) => void }) {
  const timeLeft = useCountdown(quiz.end_time)
  const attempted = !!quiz.attempt && quiz.attempt.status !== "IN_PROGRESS"
  const inProgress = quiz.attempt?.status === "IN_PROGRESS"

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#121826] border border-[#3B82F6]/30 rounded-2xl p-4 space-y-3 shadow-[0_0_20px_rgba(59,130,246,0.08)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm leading-tight truncate">{quiz.title}</p>
          <p className="text-slate-400 text-xs mt-0.5">{quiz.subject}</p>
        </div>
        <Badge className="bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40 animate-pulse shrink-0">
          LIVE
        </Badge>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-[#22C55E]" /> {timeLeft} left
        </span>
        <span>{quiz._count.questions} questions</span>
        <span>{quiz.total_marks} pts</span>
      </div>

      {attempted ? (
        <div className="flex items-center gap-2 text-[#22C55E] text-xs">
          <CheckCircle2 className="h-4 w-4" />
          <span>Submitted — {quiz.attempt!.score}/{quiz.total_marks} pts</span>
        </div>
      ) : (
        <Button
          size="sm"
          onClick={() => onEnter(quiz.id)}
          className="w-full bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] hover:opacity-90 text-white text-xs shadow-[0_0_12px_rgba(34,211,238,0.2)]"
        >
          <Swords className="h-3.5 w-3.5 mr-1.5" />
          {inProgress ? "Resume Arena" : "Enter Arena"}
          <ChevronRight className="h-3.5 w-3.5 ml-auto" />
        </Button>
      )}
    </motion.div>
  )
}

function UpcomingCard({ quiz }: { quiz: Quiz }) {
  const startsIn = useCountdown(quiz.start_time)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#121826] border border-white/6 rounded-2xl p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm leading-tight truncate">{quiz.title}</p>
          <p className="text-slate-400 text-xs mt-0.5">{quiz.subject}</p>
        </div>
        <Badge variant="outline" className="border-[#3B82F6]/40 text-[#3B82F6] shrink-0">UPCOMING</Badge>
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> Starts in {startsIn}
        </span>
        <span>{quiz._count.questions} questions · {quiz.total_marks} pts</span>
      </div>
      <div className="flex items-center gap-2 text-slate-500 text-xs">
        <Lock className="h-3.5 w-3.5" />
        <span>Opens at {new Date(quiz.start_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
    </motion.div>
  )
}

function EndedCard({ quiz, onViewResult }: { quiz: Quiz; onViewResult: (id: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0B0F1A] border border-white/[0.04] rounded-2xl p-4 space-y-3 opacity-80"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-300 text-sm leading-tight truncate">{quiz.title}</p>
          <p className="text-slate-500 text-xs mt-0.5">{quiz.subject}</p>
        </div>
        <Badge variant="outline" className="border-slate-700 text-slate-500 shrink-0">ENDED</Badge>
      </div>
      {quiz.attempt ? (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Score: <span className="text-white font-medium">{quiz.attempt.score}/{quiz.total_marks}</span>
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onViewResult(quiz.id)}
            className="text-xs text-[#22D3EE] hover:text-[#22D3EE]/80 h-7 px-2"
          >
            View Result
          </Button>
        </div>
      ) : (
        <p className="text-xs text-slate-500">Not attempted</p>
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

  const live = quizzes.filter((q) => q.effectiveStatus === "LIVE")
  const upcoming = quizzes.filter((q) => q.effectiveStatus === "UPCOMING")
  const ended = quizzes.filter((q) => q.effectiveStatus === "ENDED")

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin w-6 h-6 border-2 border-[#3B82F6] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (quizzes.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <Swords className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No contests scheduled yet.</p>
        <p className="text-xs mt-1">Check back soon!</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {live.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#22C55E] mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" /> Live Now
            </h2>
            <div className="space-y-3">{live.map((q) => <LiveCard key={q.id} quiz={q} onEnter={handleEnter} />)}</div>
          </section>
        )}
        {upcoming.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Upcoming</h2>
            <div className="space-y-3">{upcoming.map((q) => <UpcomingCard key={q.id} quiz={q} />)}</div>
          </section>
        )}
        {ended.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-3">Past Contests</h2>
            <div className="space-y-3">{ended.map((q) => <EndedCard key={q.id} quiz={q} onViewResult={setSelectedResultQuizId} />)}</div>
          </section>
        )}
      </div>

      {selectedResultQuizId && (
        <QuizResultModal
          quizId={selectedResultQuizId}
          onClose={() => setSelectedResultQuizId(null)}
        />
      )}
    </>
  )
}
