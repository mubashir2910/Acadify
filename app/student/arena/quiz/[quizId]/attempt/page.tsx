"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Send, Lock, Loader2 } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { SUBJECT_GROUP_LABELS, type SubjectGroup } from "@/schemas/quiz.schema"

interface Option {
  id: string
  text: string
  order: number
}

interface Question {
  id: string
  text: string
  type: "MCQ" | "FILL_BLANK" | "ONE_WORD"
  marks: number
  time_limit_secs: number
  options?: Option[]
}

interface AttemptState {
  attemptId: string
  questionOrder: string[]
  startedAt: string
  durationMins: number
  perQuestionTimeSecs: number | null
  endTime: string
  savedAnswers: Record<string, string | null>
  status?: string
}

interface QuizData {
  id: string
  title: string
  subject: string
  subject_group?: SubjectGroup
  questions: Question[]
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function QuestionTimer({
  secs,
  onExpire,
}: {
  secs: number
  onExpire: () => void
}) {
  const [remaining, setRemaining] = useState(secs)
  const onExpireRef = useRef(onExpire)
  const expiredRef = useRef(false)

  // Keep the latest callback in a ref so the interval effect doesn't depend on it.
  useEffect(() => {
    onExpireRef.current = onExpire
  })

  // Tick — updater is pure; no side effects on parent state from inside setState.
  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) { clearInterval(id); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // Fire onExpire once after the timer commits to 0 — safe to setState on parent here.
  useEffect(() => {
    if (remaining === 0 && !expiredRef.current) {
      expiredRef.current = true
      onExpireRef.current()
    }
  }, [remaining])

  return (
    <div className={`px-3 py-1 rounded-full font-mono text-sm font-semibold ${
      remaining <= 10 ? "bg-red-900/60 text-red-300" : "bg-white/10 text-slate-300"
    }`}>
      {pad(Math.floor(remaining / 60))}:{pad(remaining % 60)}
    </div>
  )
}

export default function ArenaAttemptPage() {
  const { quizId } = useParams<{ quizId: string }>()
  const router = useRouter()

  const [quizData, setQuizData] = useState<QuizData | null>(null)
  const [attemptState, setAttemptState] = useState<AttemptState | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | null>>({})
  const [lockedQuestions, setLockedQuestions] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [timeOverVisible, setTimeOverVisible] = useState(false)
  const [contestSecsLeft, setContestSecsLeft] = useState<number | null>(null)
  const savingRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Absolute start times per question — decouples timer from component mount
  const questionStartTimesRef = useRef<Record<string, number>>({})

  const loadAttempt = useCallback(async () => {
    setLoading(true)
    try {
      const stateRes = await fetch(`/api/quiz/${quizId}/attempt`)
      if (!stateRes.ok) {
        router.replace(`/student/arena/quiz/${quizId}`)
        return
      }
      const state: AttemptState = await stateRes.json()

      if (state.status === "SUBMITTED" || state.status === "AUTO_SUBMITTED") {
        router.replace(`/student/arena?result=${quizId}`)
        return
      }

      setAttemptState(state)
      setAnswers(state.savedAnswers ?? {})

      // Pre-lock already-passed questions and resume at first unanswered
      const firstUnanswered = state.questionOrder.findIndex((id) => !state.savedAnswers[id])
      const startIdx = firstUnanswered === -1 ? state.questionOrder.length - 1 : firstUnanswered
      setCurrentIdx(startIdx)
      setLockedQuestions(new Set(state.questionOrder.slice(0, startIdx)))

      const quizRes = await fetch(`/api/quiz/${quizId}`)
      if (!quizRes.ok) { router.replace("/student/arena"); return }
      setQuizData(await quizRes.json())
    } finally {
      setLoading(false)
    }
  }, [quizId, router])

  useEffect(() => { loadAttempt() }, [loadAttempt])

  // Silent auto-submit when contest window closes
  useEffect(() => {
    if (!attemptState?.endTime) return
    const remaining = new Date(attemptState.endTime).getTime() - Date.now()
    if (remaining <= 0) { handleSubmit(true); return }
    const id = setTimeout(() => handleSubmit(true), remaining)
    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptState?.endTime])

  // Contest countdown ticker
  useEffect(() => {
    if (!attemptState?.endTime) return
    function tick() {
      const secs = Math.max(0, Math.floor((new Date(attemptState!.endTime).getTime() - Date.now()) / 1000))
      setContestSecsLeft(secs)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [attemptState?.endTime])

  // Per-question start-time tracking — prevents timer-reset exploit via navigation
  // On first visit: record absolute start time.
  // On re-visit: compute elapsed; if expired, trigger expiry immediately.
  useEffect(() => {
    if (!quizData || !attemptState) return
    const questionMap = Object.fromEntries(quizData.questions.map((q) => [q.id, q]))
    const question = (
      attemptState.questionOrder.map((id) => questionMap[id]).filter(Boolean) as Question[]
    )[currentIdx]
    if (!question || !question.time_limit_secs || lockedQuestions.has(question.id)) return

    const qid = question.id
    const limitMs = question.time_limit_secs * 1000

    if (!questionStartTimesRef.current[qid]) {
      // First visit — lock in the start time
      questionStartTimesRef.current[qid] = Date.now()
    } else {
      // Re-visit — check if time expired while navigating away
      if (Date.now() - questionStartTimesRef.current[qid] >= limitMs) {
        handleQuestionTimeExpire()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, quizData, attemptState])

  function handleAnswer(questionId: string, answer: string | null) {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
    if (savingRef.current) clearTimeout(savingRef.current)
    savingRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/quiz/${quizId}/attempt`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId, givenAnswer: answer }),
        })
      } catch { /* silent */ }
    }, 400)
  }

  async function handleSubmit(isAuto = false) {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/quiz/${quizId}/attempt/submit`, { method: "POST" })
      if (!res.ok) {
        const json = await res.json()
        if (json.message === "ALREADY_SUBMITTED") {
          window.location.href = `/student/arena?result=${quizId}`
          return
        }
        if (!isAuto) toast.error("Failed to submit — please try again")
        return
      }
      window.location.href = `/student/arena?result=${quizId}`
    } finally {
      setSubmitting(false)
    }
  }

  // Lock current question and advance to next (or submit on last)
  function lockAndAdvance() {
    if (!attemptState) return
    const currentId = orderedQuestions[currentIdx]?.id
    if (currentId) {
      setLockedQuestions((prev) => new Set([...prev, currentId]))
    }
    if (currentIdx < attemptState.questionOrder.length - 1) {
      setCurrentIdx((i) => i + 1)
    } else {
      handleSubmit(false)
    }
  }

  function handleQuestionTimeExpire() {
    if (!attemptState) return
    if (currentIdx === attemptState.questionOrder.length - 1) {
      // Last question — show Time Over overlay then auto-submit
      setTimeOverVisible(true)
      setTimeout(() => handleSubmit(false), 1500)
    } else {
      lockAndAdvance()
    }
  }

  if (loading || !quizData || !attemptState) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-[#3B82F6] border-t-transparent rounded-full" />
      </div>
    )
  }

  const questionMap = Object.fromEntries(quizData.questions.map((q) => [q.id, q]))
  const orderedQuestions = attemptState.questionOrder.map((id) => questionMap[id]).filter(Boolean) as Question[]
  const currentQuestion = orderedQuestions[currentIdx]
  if (!currentQuestion) return null

  const isLocked = lockedQuestions.has(currentQuestion.id)
  const isLastQuestion = currentIdx === orderedQuestions.length - 1

  const answeredSet = new Set(
    Object.entries(answers).filter(([, v]) => v !== null && v !== "").map(([k]) => k)
  )

  const typeLabel =
    currentQuestion.type === "MCQ" ? "Multiple Choice"
    : currentQuestion.type === "FILL_BLANK" ? "Fill in the Blank"
    : "One Word Answer"

  // Remaining time for the current question — computed from absolute start time so
  // navigating away and back does not reset the clock.
  const questionTimeRemainingSecs = (() => {
    if (!currentQuestion.time_limit_secs || isLocked) return 0
    const startTime = questionStartTimesRef.current[currentQuestion.id]
    if (!startTime) return currentQuestion.time_limit_secs // start time set by effect after first render
    return Math.max(0, currentQuestion.time_limit_secs - (Date.now() - startTime) / 1000)
  })()

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white flex flex-col relative">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-[#0B0F1A]/95 backdrop-blur border-b border-white/[0.06] px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate text-sm">{quizData.title}</p>
          <p className="text-xs text-slate-500">
            {quizData.subject_group ? SUBJECT_GROUP_LABELS[quizData.subject_group] : ""}
            {quizData.subject_group ? " · " : ""}
            {quizData.subject}
          </p>
        </div>
        {contestSecsLeft !== null && (
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs font-semibold border ${
            contestSecsLeft <= 60
              ? "bg-red-900/40 border-red-500/40 text-red-300"
              : contestSecsLeft <= 300
              ? "bg-amber-900/40 border-amber-500/40 text-amber-300"
              : "bg-white/5 border-white/10 text-slate-400"
          }`}>
            <span>⏱</span>
            <span>
              {contestSecsLeft >= 3600
                ? `${pad(Math.floor(contestSecsLeft / 3600))}:${pad(Math.floor((contestSecsLeft % 3600) / 60))}:${pad(contestSecsLeft % 60)}`
                : `${pad(Math.floor(contestSecsLeft / 60))}:${pad(contestSecsLeft % 60)}`}
            </span>
          </div>
        )}
        <span className="text-xs text-slate-500">{currentIdx + 1} / {orderedQuestions.length}</span>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-5">
        {/* Question card */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="bg-[#121826] border border-white/[0.06] rounded-2xl p-5 space-y-5"
          >
          {/* Question header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 font-medium">Q{currentIdx + 1} of {orderedQuestions.length}</span>
              <span className="text-xs bg-white/10 text-slate-300 px-2 py-0.5 rounded-full">{typeLabel}</span>
              <span className="text-xs bg-[#FACC15]/10 text-[#FACC15] border border-[#FACC15]/20 px-2 py-0.5 rounded-full">{currentQuestion.marks} XP</span>
              {isLocked && (
                <span className="text-xs bg-white/10 text-slate-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Locked
                </span>
              )}
            </div>
            {questionTimeRemainingSecs > 0 && (
              <QuestionTimer
                key={currentQuestion.id}
                secs={Math.ceil(questionTimeRemainingSecs)}
                onExpire={handleQuestionTimeExpire}
              />
            )}
          </div>

          {/* Question text */}
          <p className="text-base text-white leading-relaxed">{currentQuestion.text}</p>

          {/* MCQ options */}
          {currentQuestion.type === "MCQ" && currentQuestion.options && (
            <div className="space-y-2">
              {currentQuestion.options
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((option) => {
                  const selected = answers[currentQuestion.id] === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={isLocked}
                      onClick={isLocked ? undefined : () => handleAnswer(currentQuestion.id, option.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ${
                        selected
                          ? "bg-[#3B82F6]/20 border-[#3B82F6] text-white font-medium"
                          : isLocked
                          ? "bg-[#1A2236] border-white/10 text-slate-400 opacity-70 cursor-not-allowed"
                          : "bg-[#1A2236] border-white/10 text-slate-300 hover:border-[#3B82F6]/50 hover:bg-[#1A2236]"
                      }`}
                    >
                      {option.text}
                    </button>
                  )
                })}
            </div>
          )}

          {/* Text answer */}
          {(currentQuestion.type === "FILL_BLANK" || currentQuestion.type === "ONE_WORD") && (
            <input
              type="text"
              placeholder={currentQuestion.type === "ONE_WORD" ? "Type your one-word answer…" : "Type your answer…"}
              value={answers[currentQuestion.id] ?? ""}
              readOnly={isLocked}
              disabled={isLocked}
              onChange={(e) => handleAnswer(currentQuestion.id, e.target.value || null)}
              className={`w-full bg-[#121826] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-[#3B82F6]/60 transition-colors ${
                isLocked ? "opacity-70 cursor-not-allowed" : ""
              }`}
              autoFocus={!isLocked}
            />
          )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setCurrentIdx((i) => i - 1)}
            disabled={currentIdx === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm disabled:opacity-30 hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>

          {isLastQuestion ? (
            <motion.button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={submitting || isLocked}
              whileTap={submitting || isLocked ? undefined : { scale: 0.97 }}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-progress shadow-[0_0_16px_rgba(34,197,94,0.3)] hover:opacity-90 transition-opacity"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitting ? "Submitting…" : "Submit"}
            </motion.button>
          ) : (
            <motion.button
              type="button"
              onClick={lockAndAdvance}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#3B82F6]/20 border border-[#3B82F6]/40 text-[#3B82F6] text-sm hover:bg-[#3B82F6]/30 transition-colors"
            >
              Next <ChevronRight className="h-4 w-4" />
            </motion.button>
          )}
        </div>

        {/* Question navigator */}
        <div className="bg-[#121826] border border-white/[0.06] rounded-2xl p-4">
          <p className="text-xs text-slate-500 mb-3 font-medium">Question Navigator</p>
          <div className="flex gap-1.5 flex-wrap">
            {attemptState.questionOrder.map((id, i) => (
              <button
                key={id}
                type="button"
                onClick={() => setCurrentIdx(i)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                  i === currentIdx
                    ? "bg-[#3B82F6] text-white"
                    : answeredSet.has(id)
                    ? "bg-[#22C55E] text-white"
                    : "bg-white/10 text-slate-400 hover:bg-white/20"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">{answeredSet.size} / {orderedQuestions.length} answered</p>
        </div>

      </div>

      {/* Time Over overlay — shown when last question timer expires */}
      {timeOverVisible && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#121826] border border-red-500/30 rounded-2xl px-10 py-8 flex flex-col items-center gap-3 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
            <span className="text-4xl">⏰</span>
            <p className="text-xl font-bold text-white">Time&apos;s Up!</p>
            <p className="text-sm text-slate-400">Submitting your answers…</p>
          </div>
        </div>
      )}
    </div>
  )
}
