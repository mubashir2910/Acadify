"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { type EffectiveStatus, deriveEffectiveStatus } from "@/lib/quiz-status"
import { Clock, Users, BookOpen, Trash2, Eye, X } from "lucide-react"
import { SUBJECT_GROUP_LABELS, type SubjectGroup } from "@/schemas/quiz.schema"

type QuizStatus = "DRAFT" | "ACTIVE" | "CLOSED"

interface ContestCardProps {
  quiz: {
    id: string
    title: string
    subject: string
    subject_group?: SubjectGroup
    class: string
    section: string
    status: QuizStatus
    effectiveStatus: EffectiveStatus  // passed from parent (pre-computed), used as initial value
    total_marks: number
    duration_mins: number
    start_time: string
    end_time: string
    _count: { questions: number; attempts: number }
  }
  detailBasePath: string
  onDeleted: (id: string) => void
  onStatusChanged: (id: string, status: QuizStatus) => void
}

const EFFECTIVE_STATUS_STYLES: Record<EffectiveStatus, string> = {
  UPCOMING: "bg-blue-100 text-blue-700 dark:text-blue-400",
  LIVE: "bg-green-100 text-green-700 dark:text-green-400",
  ENDED: "bg-muted text-muted-foreground",
}

export function ContestCard({ quiz, detailBasePath, onDeleted, onStatusChanged }: ContestCardProps) {
  const [loading, setLoading] = useState(false)
  // Always derive from timing fields — never rely solely on stale prop
  const effectiveStatus = deriveEffectiveStatus(quiz.status, quiz.start_time, quiz.end_time)

  async function handleClose() {
    setLoading(true)
    try {
      const res = await fetch(`/api/quiz/${quiz.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.message ?? "Failed to close contest")
        return
      }
      toast.success("Contest closed.")
      onStatusChanged(quiz.id, "CLOSED")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this contest? This cannot be undone.")) return
    setLoading(true)
    try {
      const res = await fetch(`/api/quiz/${quiz.id}`, { method: "DELETE" })
      if (!res.ok) {
        const json = await res.json()
        toast.error(json.message ?? "Failed to delete contest")
        return
      }
      toast.success("Contest deleted.")
      onDeleted(quiz.id)
    } finally {
      setLoading(false)
    }
  }

  const formatDT = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    })

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{quiz.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <BookOpen className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
              <span className="text-sm text-muted-foreground">
                {quiz.subject_group ? SUBJECT_GROUP_LABELS[quiz.subject_group] : ""}
                {quiz.subject_group ? " · " : ""}
                {quiz.subject}
              </span>
            </div>
          </div>
          <Badge className={`${EFFECTIVE_STATUS_STYLES[effectiveStatus]} text-xs flex-shrink-0`}>
            {effectiveStatus}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            Class {quiz.class}-{quiz.section}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {quiz.duration_mins}m
          </div>
          <div>
            {quiz._count.questions}Q · {quiz.total_marks}M · {quiz._count.attempts} attempts
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {formatDT(quiz.start_time)} → {formatDT(quiz.end_time)}
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-border">
          <Button variant="outline" size="sm" asChild>
            <Link href={`${detailBasePath}/${quiz.id}`}>
              <Eye className="h-3.5 w-3.5 mr-1" /> View
            </Link>
          </Button>

          {/* Close only while LIVE — not after contest has ended */}
          {effectiveStatus === "LIVE" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              loading={loading}
              loadingText="Closing…"
              className="text-red-600 dark:text-red-400 border-red-200 hover:bg-red-500/10"
            >
              <X className="h-3.5 w-3.5 mr-1" /> Close Early
            </Button>
          )}

          {/* Delete only when no attempts exist */}
          {quiz._count.attempts === 0 && effectiveStatus !== "LIVE" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              loading={loading}
              className="text-red-500 hover:text-red-700 hover:bg-red-500/10 ml-auto"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
