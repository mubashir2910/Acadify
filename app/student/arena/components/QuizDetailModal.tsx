"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { X, CheckCircle2, XCircle, Clock, Target } from "lucide-react"
import { SUBJECT_GROUP_LABELS, type SubjectGroup } from "@/schemas/quiz.schema"
import { ArenaSpinner } from "./ArenaSpinner"

interface QuizOption {
  id: string
  text: string
  is_correct: boolean
}

interface QuizQuestion {
  id: string
  text: string
  type: string
  marks: number
  time_limit_secs: number
  correct_answer: string | null
  options: QuizOption[]
  studentAnswer: {
    givenAnswer: string | null
    isCorrect: boolean
    marksAwarded: number
  }
}

interface QuizResultData {
  title: string
  subject: string
  subject_group?: SubjectGroup
  total_marks: number
  score: number
  status: string
  timeTakenMs: number | null
  questions: QuizQuestion[]
}

function formatTime(ms: number | null) {
  if (!ms) return "—"
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}m ${s}s`
}

interface QuizDetailModalProps {
  quizId: string
  onClose: () => void
}

export function QuizDetailModal({ quizId, onClose }: QuizDetailModalProps) {
  const [data, setData] = useState<QuizResultData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(false)
    fetch(`/api/quiz/${quizId}/result`)
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((d: QuizResultData) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [quizId])

  const pct = data && data.total_marks > 0
    ? Math.round((data.score / data.total_marks) * 100)
    : 0

  const correct = data?.questions.filter((q) => q.studentAnswer.isCorrect).length ?? 0
  const total = data?.questions.length ?? 0

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
          className="bg-[#0B0F1A] border border-white/10 rounded-t-3xl max-h-[92vh] overflow-y-auto"
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="sticky top-0 bg-[#0B0F1A] border-b border-white/10 px-5 py-3 flex items-center justify-between z-10">
            <div>
              <p className="font-semibold text-white text-sm truncate max-w-[240px]">{data?.title ?? "Loading..."}</p>
              <p className="text-xs text-slate-500">
                {data?.subject_group ? SUBJECT_GROUP_LABELS[data.subject_group] : ""}
                {data?.subject_group && data?.subject ? " · " : ""}
                {data?.subject}
              </p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors ml-2 flex-shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <ArenaSpinner size="sm" tagline="Loading Challenge" />
            </div>
          ) : error ? (
            <div className="text-center py-16 text-slate-500">
              <p className="text-sm">Could not load result.</p>
            </div>
          ) : data ? (
            <div className="px-5 py-4 space-y-5">
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#121826] rounded-xl p-3 text-center border border-white/5">
                  <p className={`text-xl font-bold ${pct >= 80 ? "text-[#22C55E]" : pct >= 50 ? "text-[#3B82F6]" : "text-[#EF4444]"}`}>{pct}%</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Accuracy</p>
                </div>
                <div className="bg-[#121826] rounded-xl p-3 text-center border border-white/5">
                  <p className="text-xl font-bold text-white">{correct}/{total}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Correct</p>
                </div>
                <div className="bg-[#121826] rounded-xl p-3 text-center border border-white/5">
                  <p className="text-xl font-bold text-white">{formatTime(data.timeTakenMs)}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Time</p>
                </div>
              </div>

              {/* Per-question breakdown */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Question Breakdown</p>
                {data.questions.map((q, idx) => {
                  const { isCorrect, givenAnswer, marksAwarded } = q.studentAnswer
                  const notAnswered = givenAnswer == null || givenAnswer === ""

                  // Resolve display answer for MCQ
                  let displayAnswer: string | null = givenAnswer
                  let correctDisplay: string | null = null

                  if (q.type === "MCQ") {
                    const chosen = q.options.find((o) => o.id === givenAnswer)
                    const correctOpt = q.options.find((o) => o.is_correct)
                    displayAnswer = chosen?.text ?? null
                    if (!isCorrect) correctDisplay = correctOpt?.text ?? null
                  } else {
                    correctDisplay = isCorrect ? null : (q.correct_answer ?? null)
                  }

                  return (
                    <div
                      key={q.id}
                      className={`rounded-xl border p-4 space-y-2.5 ${
                        isCorrect
                          ? "bg-[#22C55E]/5 border-[#22C55E]/20"
                          : "bg-[#EF4444]/5 border-[#EF4444]/20"
                      }`}
                    >
                      {/* Question header */}
                      <div className="flex items-start gap-2">
                        {isCorrect ? (
                          <CheckCircle2 className="h-4 w-4 text-[#22C55E] flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-4 w-4 text-[#EF4444] flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium leading-snug">
                            Q{idx + 1}. {q.text}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />{q.time_limit_secs}s
                            </span>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Target className="h-2.5 w-2.5" />{marksAwarded}/{q.marks} XP
                            </span>
                          </div>
                        </div>
                        {notAnswered && (
                          <span className="shrink-0 mt-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#FACC15]/15 text-[#FACC15] border border-[#FACC15]/30 whitespace-nowrap">
                            Not Answered
                          </span>
                        )}
                      </div>

                      {/* MCQ options */}
                      {q.type === "MCQ" && q.options.length > 0 && (
                        <div className="space-y-1.5 pl-6">
                          {q.options.map((opt) => {
                            const isChosen = opt.id === givenAnswer
                            const isCorrectOpt = opt.is_correct
                            return (
                              <div
                                key={opt.id}
                                className={`text-xs px-3 py-1.5 rounded-lg border ${
                                  isCorrectOpt
                                    ? "bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E]"
                                    : isChosen
                                    ? "bg-[#EF4444]/15 border-[#EF4444]/30 text-[#EF4444]"
                                    : "bg-white/[0.03] border-white/5 text-slate-400"
                                }`}
                              >
                                {opt.text}
                                {isCorrectOpt && <span className="ml-1 text-[10px]">✓</span>}
                                {isChosen && !isCorrectOpt && <span className="ml-1 text-[10px]">✗ your answer</span>}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Fill blank / one word answers */}
                      {q.type !== "MCQ" && (
                        <div className="pl-6 space-y-1.5">
                          <div className={`text-xs px-3 py-1.5 rounded-lg border ${
                            isCorrect
                              ? "bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E]"
                              : "bg-[#EF4444]/15 border-[#EF4444]/30 text-[#EF4444]"
                          }`}>
                            Your answer: <span className="font-medium">{displayAnswer ?? "—"}</span>
                          </div>
                          {!isCorrect && correctDisplay && (
                            <div className="text-xs px-3 py-1.5 rounded-lg border bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E]">
                              Correct: <span className="font-medium">{correctDisplay}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
