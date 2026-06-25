"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertCircle, Swords, ChevronLeft, BookOpen, Loader2 } from "lucide-react"
import { motion } from "motion/react"
import { SUBJECT_GROUP_LABELS, type SubjectGroup } from "@/schemas/quiz.schema"
import { ArenaSpinner } from "@/app/student/arena/components/ArenaSpinner"
import { friendlyAttemptError } from "@/lib/error-messages"

interface Quiz {
  id: string
  title: string
  subject: string
  subject_group?: SubjectGroup
  class: string
  section: string
  instructions: string | null
  total_marks: number
  duration_mins: number
  per_question_time_secs: number | null
  start_time: string
  end_time: string
  shuffle_questions: boolean
  total_time_secs: number
  _count: { questions: number }
}

// Hide a stat icon gracefully if its asset file isn't present yet.
function hideOnError(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = "none"
}

// Real quiz length = sum of per-question time limits (not the contest window).
function formatQuizTime(totalSecs: number): string {
  if (totalSecs < 60) return `${totalSecs}s`
  const m = Math.floor(totalSecs / 60)
  const s = totalSecs % 60
  return s === 0 ? `${m} min` : `${m}m ${s}s`
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
        toast.error(friendlyAttemptError(json.message))
        return
      }
      router.push(`/student/arena/quiz/${quizId}/attempt`)
    } finally {
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <ArenaSpinner fullscreen size="lg" tagline="Preparing the Arena" />
    )
  }

  if (!quiz) return null

  const now = new Date()
  const canStart = now >= new Date(quiz.start_time) && now <= new Date(quiz.end_time)
  const notStarted = now < new Date(quiz.start_time)

  const questionCount = quiz._count.questions
  const totalQuizSecs = quiz.total_time_secs

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-[#0B0F1A]/95 backdrop-blur border-b border-white/[0.06] px-4 py-3 flex items-center gap-3 relative">
        <button
          type="button"
          onClick={() => router.push("/student/arena")}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <p className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-white pointer-events-none">
          Challenge Details
        </p>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        {/* Details card — title + key stats inside a contained box */}
        <div className="bg-[#121826] border border-white/10 rounded-2xl p-5 space-y-5">
          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-white">{quiz.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <BookOpen className="h-4 w-4 text-[#3B82F6]" />
              <span className="text-slate-400 text-sm">
                {quiz.subject_group ? SUBJECT_GROUP_LABELS[quiz.subject_group] : ""}
                {quiz.subject_group ? " · " : ""}
                {quiz.subject}
              </span>
            </div>
          </div>

          {/* Stat boxes — XP Reward / Questions / Quiz Time (icon on top, one line) */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#0F1521] border border-white/[0.08] rounded-xl p-3 flex flex-col items-center text-center gap-1">
              <img src="/assets/arena/star.png" alt="" onError={hideOnError} className="h-6 w-6 object-contain" />
              <p className="text-white font-bold text-base">+{quiz.total_marks}</p>
              <p className="text-slate-500 text-[11px]">XP Reward</p>
            </div>
            <div className="bg-[#0F1521] border border-white/[0.08] rounded-xl p-3 flex flex-col items-center text-center gap-1">
              <img src="/assets/arena/totalquestions.png" alt="" onError={hideOnError} className="h-6 w-6 object-contain" />
              <p className="text-white font-bold text-base">{questionCount}</p>
              <p className="text-slate-500 text-[11px]">Questions</p>
            </div>
            <div className="bg-[#0F1521] border border-white/[0.08] rounded-xl p-3 flex flex-col items-center text-center gap-1">
              <img src="/assets/arena/totaltime.png" alt="" onError={hideOnError} className="h-6 w-6 object-contain" />
              <p className="text-white font-bold text-base">{formatQuizTime(totalQuizSecs)}</p>
              <p className="text-slate-500 text-[11px]">Quiz Time</p>
            </div>
          </div>
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
            className="w-full py-4 rounded-xl font-semibold text-white text-base bg-gradient-to-r from-[#22C55E] to-[#16A34A] hover:opacity-90 disabled:opacity-70 disabled:cursor-progress transition-opacity shadow-[0_0_24px_rgba(34,197,94,0.3)] flex items-center justify-center gap-2"
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
