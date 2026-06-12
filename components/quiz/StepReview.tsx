"use client"

import { UseFormReturn } from "react-hook-form"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, BookOpen, Users, Shuffle, Trophy } from "lucide-react"
import { SUBJECT_GROUP_LABELS, type CreateQuizInput } from "@/schemas/quiz.schema"

const TYPE_LABELS: Record<string, string> = {
  MCQ: "MCQ",
  FILL_BLANK: "Fill Blank",
  ONE_WORD: "One Word",
}

interface StepReviewProps {
  form: UseFormReturn<CreateQuizInput>
}

export function StepReview({ form }: StepReviewProps) {
  const values = form.getValues()

  const durationMins = values.startTime && values.endTime
    ? Math.floor((new Date(values.endTime).getTime() - new Date(values.startTime).getTime()) / 60_000)
    : 0

  const formatDT = (iso: string) => {
    if (!iso) return "—"
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-5">
      {/* Summary Card */}
      <Card className="bg-muted/50 border-border">
        <CardContent className="p-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Contest Title</p>
            <p className="font-semibold text-foreground">{values.title}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BookOpen className="h-4 w-4 text-blue-500" />
              <span>
                {values.subjectGroup ? SUBJECT_GROUP_LABELS[values.subjectGroup] : ""}
                {values.subjectGroup && values.subject ? " · " : ""}
                {values.subject}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 text-purple-500" />
              <span>Class {values.class} — {values.section}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span>{values.totalPoints} total points</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-amber-500" />
              <span>{durationMins} mins</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground col-span-2">
              <Shuffle className="h-4 w-4 text-green-500" />
              <span>
                {values.shuffleQuestions ? "Questions shuffled" : "Fixed order"}
                {values.shuffleOptions ? " · Options shuffled" : ""}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
            <div>
              <p className="text-xs text-muted-foreground">Starts</p>
              <p>{formatDT(values.startTime)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ends</p>
              <p>{formatDT(values.endTime)}</p>
            </div>
          </div>

          {values.instructions && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Instructions</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{values.instructions}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions Summary */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="font-medium text-foreground">
            {values.questions.length} Questions
          </p>
          <Badge variant="outline">{values.totalPoints} total points</Badge>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {values.questions.map((q, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg text-sm"
            >
              <span className="text-muted-foreground font-mono text-xs mt-0.5 w-5 flex-shrink-0">
                {i + 1}.
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-foreground truncate">{q.text || <em className="text-slate-300">No text</em>}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Badge variant="secondary" className="text-xs">
                  {TYPE_LABELS[q.type]}
                </Badge>
                <span className="text-xs text-muted-foreground">{q.marks}pts</span>
                <span className="text-xs text-muted-foreground">{q.timeLimitSecs}s</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground bg-green-500/10 border border-green-100 rounded-lg p-3">
        The contest will go <strong>live automatically</strong> at the scheduled start time and close at the end time.
      </p>
    </div>
  )
}
