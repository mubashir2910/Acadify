"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QuizLeaderboard } from "@/components/quiz/QuizLeaderboard"
import { type EffectiveStatus, deriveEffectiveStatus } from "@/lib/quiz-status"
import { Clock, BookOpen, Users, X, CheckCircle } from "lucide-react"

type QuizStatus = "DRAFT" | "ACTIVE" | "CLOSED"

interface Quiz {
  id: string
  title: string
  subject: string
  instructions: string | null
  class: string
  section: string
  status: QuizStatus
  total_marks: number
  duration_mins: number
  per_question_time_secs: number | null
  start_time: string
  end_time: string
  shuffle_questions: boolean
  shuffle_options: boolean
  creator: { name: string }
  questions: Array<{
    id: string
    text: string
    type: string
    marks: number
    order: number
    correct_answer: string | null
    options: Array<{ id: string; text: string; is_correct: boolean; order: number }>
  }>
  _count: { attempts: number }
}

const EFFECTIVE_STATUS_STYLES: Record<EffectiveStatus, string> = {
  UPCOMING: "bg-blue-100 text-blue-700 dark:text-blue-400",
  LIVE: "bg-green-100 text-green-700 dark:text-green-400",
  ENDED: "bg-muted text-muted-foreground",
}

const TYPE_LABELS: Record<string, string> = {
  MCQ: "MCQ",
  FILL_BLANK: "Fill Blank",
  ONE_WORD: "One Word",
}

export function QuizDetailSection({ quizId }: { quizId: string }) {
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  // Real-time derived status — recomputed every 10s from start/end times, never stale
  const [effectiveStatus, setEffectiveStatus] = useState<EffectiveStatus>("UPCOMING")

  useEffect(() => {
    if (!quiz) return
    const update = () =>
      setEffectiveStatus(deriveEffectiveStatus(quiz.status, quiz.start_time, quiz.end_time))
    update()
    const id = setInterval(update, 10_000)
    return () => clearInterval(id)
  }, [quiz])

  const fetchQuiz = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/quiz/${quizId}`)
      if (!res.ok) return
      setQuiz(await res.json())
    } finally {
      setLoading(false)
    }
  }, [quizId])

  useEffect(() => { fetchQuiz() }, [fetchQuiz])

  async function closeContest() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/quiz/${quizId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.message ?? "Failed"); return }
      toast.success("Contest closed.")
      setQuiz((q) => q ? { ...q, status: "CLOSED" } : q)
      setEffectiveStatus("ENDED")
    } finally {
      setActionLoading(false)
    }
  }

  const formatDT = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    })

  if (loading) return <div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-64" /></div>
  if (!quiz) return <p className="text-muted-foreground">Contest not found.</p>

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-foreground">{quiz.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <BookOpen className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">{quiz.subject}</span>
              </div>
            </div>
            <Badge className={`${EFFECTIVE_STATUS_STYLES[effectiveStatus]} text-sm`}>{effectiveStatus}</Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 text-purple-500" />
              Class {quiz.class}–{quiz.section}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-amber-500" />
              {quiz.duration_mins}m
              {quiz.per_question_time_secs && (
                <Badge variant="secondary" className="text-xs">{quiz.per_question_time_secs}s/Q</Badge>
              )}
            </div>
            <div className="text-muted-foreground">
              {quiz.questions.length}Q · {quiz.total_marks}M
            </div>
            <div className="text-muted-foreground">
              {quiz._count.attempts} attempts
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Window: </span>
            {formatDT(quiz.start_time)} → {formatDT(quiz.end_time)}
          </div>

          {quiz.instructions && (
            <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 whitespace-pre-wrap">
              {quiz.instructions}
            </p>
          )}

          {/* Actions — derived from real-time effectiveStatus, not stale DB status */}
          {effectiveStatus === "LIVE" && (
            <Button
              variant="outline"
              className="text-red-600 dark:text-red-400 border-red-200 hover:bg-red-500/10"
              onClick={closeContest}
              loading={actionLoading}
              loadingText="Closing…"
            >
              <X className="h-4 w-4 mr-1" /> Close Contest Early
            </Button>
          )}
          {effectiveStatus === "ENDED" && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CheckCircle className="h-4 w-4" /> Contest has ended
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs: Questions / Leaderboard */}
      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">Questions ({quiz.questions.length})</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="mt-4 space-y-3">
          {quiz.questions.map((q, i) => (
            <Card key={q.id} className="border-border">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <span className="text-muted-foreground font-mono text-sm mt-0.5 w-6 flex-shrink-0">
                    {i + 1}.
                  </span>
                  <div className="flex-1 space-y-2">
                    <p className="text-foreground">{q.text}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{TYPE_LABELS[q.type] ?? q.type}</Badge>
                      <span className="text-xs text-muted-foreground">{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
                    </div>

                    {q.type === "MCQ" && q.options.length > 0 && (
                      <ul className="space-y-1 mt-2">
                        {q.options
                          .slice()
                          .sort((a, b) => a.order - b.order)
                          .map((o) => (
                            <li
                              key={o.id}
                              className={`text-sm flex items-center gap-2 px-2 py-1 rounded ${
                                o.is_correct
                                  ? "bg-green-500/10 text-green-700 dark:text-green-400 font-medium"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {o.is_correct && <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />}
                              {o.text}
                            </li>
                          ))}
                      </ul>
                    )}

                    {q.type !== "MCQ" && q.correct_answer && (
                      <p className="text-sm text-green-700 dark:text-green-400 bg-green-500/10 px-2 py-1 rounded">
                        ✓ {q.correct_answer}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-4">
          <QuizLeaderboard quizId={quizId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
