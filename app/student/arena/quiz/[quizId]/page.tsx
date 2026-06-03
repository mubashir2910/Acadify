"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Clock, Users, Shuffle, Timer, AlertCircle, Swords, ChevronLeft, BookOpen, Loader2 } from "lucide-react"
import { motion } from "motion/react"

interface Quiz {
  id: string
  title: string
  subject: string
  class: string
  section: string
  instructions: string | null
  total_marks: number
  duration_mins: number
  per_question_time_secs: number | null
  start_time: string
  end_time: string
  shuffle_questions: boolean
  _count: { questions: number }
}

export default function ArenaQuizInstructionsPage() {
  const { quizId } = useParams<{ quizId: string }>()
  const router = useRouter()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  const fetchQuiz = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/quiz/${quizId}`)
      if (!res.ok) { router.replace("/student/arena"); return }
      const data: Quiz = await res.json()

      // If already submitted, go back to arena and show result
      const attemptRes = await fetch(`/api/quiz/${quizId}/attempt`)
      if (attemptRes.ok) {
        const attempt = await attemptRes.json()
        if (attempt.status === "SUBMITTED" || attempt.status === "AUTO_SUBMITTED") {
          router.replace(`/student/arena?result=${quizId}`)
          return
        }
        // In progress — go straight to attempt
        if (attempt.status === "IN_PROGRESS") {
          router.replace(`/student/arena/quiz/${quizId}/attempt`)
          return
        }
      }

      setQuiz(data)
    } finally {
      setLoading(false)
    }
  }, [quizId, router])

  useEffect(() => { fetchQuiz() }, [fetchQuiz])

  async function handleStart() {
    setStarting(true)
    try {
      const res = await fetch(`/api/quiz/${quizId}/attempt`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) {
        if (res.status === 409 && json.message === "ALREADY_SUBMITTED") {
          router.replace(`/student/arena?result=${quizId}`)
          return
        }
        toast.error(json.message ?? "Cannot start quiz")
        return
      }
      router.push(`/student/arena/quiz/${quizId}/attempt`)
    } finally {
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-[#3B82F6] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!quiz) return null

  const now = new Date()
  const canStart = now >= new Date(quiz.start_time) && now <= new Date(quiz.end_time)
  const notStarted = now < new Date(quiz.start_time)

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-[#0B0F1A]/95 backdrop-blur border-b border-white/[0.06] px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/student/arena")}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Arena
        </button>
        <div className="ml-auto flex items-center gap-2">
          <Swords className="h-4 w-4 text-[#22D3EE]" />
          <span className="text-xs font-semibold tracking-widest text-[#22D3EE] uppercase">Arena</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-white">{quiz.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <BookOpen className="h-4 w-4 text-[#3B82F6]" />
            <span className="text-slate-400 text-sm">{quiz.subject}</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#121826] border border-white/[0.06] rounded-xl p-3 flex items-center gap-3">
            <Clock className="h-4 w-4 text-[#FACC15] shrink-0" />
            <div>
              <p className="text-slate-500 text-xs">Duration</p>
              <p className="text-white font-medium text-sm">{quiz.duration_mins} minutes</p>
            </div>
          </div>
          <div className="bg-[#121826] border border-white/[0.06] rounded-xl p-3 flex items-center gap-3">
            <Users className="h-4 w-4 text-[#22D3EE] shrink-0" />
            <div>
              <p className="text-slate-500 text-xs">Questions</p>
              <p className="text-white font-medium text-sm">{quiz._count.questions} · {quiz.total_marks} points</p>
            </div>
          </div>
          {quiz.per_question_time_secs && (
            <div className="bg-[#121826] border border-white/[0.06] rounded-xl p-3 flex items-center gap-3">
              <Timer className="h-4 w-4 text-[#EF4444] shrink-0" />
              <div>
                <p className="text-slate-500 text-xs">Per Question</p>
                <p className="text-white font-medium text-sm">{quiz.per_question_time_secs}s</p>
              </div>
            </div>
          )}
          {quiz.shuffle_questions && (
            <div className="bg-[#121826] border border-white/[0.06] rounded-xl p-3 flex items-center gap-3">
              <Shuffle className="h-4 w-4 text-[#22C55E] shrink-0" />
              <div>
                <p className="text-slate-500 text-xs">Order</p>
                <p className="text-white font-medium text-sm">Randomized</p>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        {quiz.instructions && (
          <div className="bg-[#1A2236] border border-[#3B82F6]/20 rounded-xl p-4">
            <p className="text-sm font-semibold text-[#3B82F6] mb-2">Instructions</p>
            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{quiz.instructions}</p>
          </div>
        )}

        {/* Rules */}
        <div className="bg-[#1A1200] border border-[#FACC15]/20 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-[#FACC15] flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4" /> Rules
          </p>
          <ul className="text-sm text-amber-200/80 space-y-1.5 list-disc list-inside">
            <li>The quiz will auto-submit when time runs out.</li>
            {quiz.per_question_time_secs && (
              <li>Each question has a {quiz.per_question_time_secs}s time limit.</li>
            )}
            <li>Your answers are saved automatically as you proceed.</li>
            <li>You can only attempt this quiz once.</li>
            <li>Do not close or refresh the browser during the quiz.</li>
          </ul>
        </div>

        {/* Status / Action */}
        {notStarted && (
          <div className="bg-[#121826] border border-white/10 rounded-xl px-4 py-3 text-slate-400 text-sm text-center">
            Quiz has not started yet
          </div>
        )}

        {!canStart && !notStarted && (
          <div className="bg-[#121826] border border-white/10 rounded-xl px-4 py-3 text-slate-400 text-sm text-center">
            Quiz window has closed
          </div>
        )}

        {canStart && (
          <motion.button
            type="button"
            onClick={handleStart}
            disabled={starting}
            whileTap={starting ? undefined : { scale: 0.97 }}
            className="w-full py-4 rounded-xl font-semibold text-white text-base bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] hover:opacity-90 disabled:opacity-70 disabled:cursor-progress transition-opacity shadow-[0_0_24px_rgba(34,211,238,0.25)] flex items-center justify-center gap-2"
          >
            {starting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Swords className="h-5 w-5" />
            )}
            {starting ? "Starting…" : "Enter Arena"}
          </motion.button>
        )}
      </div>
    </div>
  )
}
