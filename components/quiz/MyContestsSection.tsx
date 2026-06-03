"use client"

import { useCallback, useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { ContestCard } from "@/components/quiz/ContestCard"
import { type EffectiveStatus, deriveEffectiveStatus } from "@/lib/quiz-status"
import { Swords } from "lucide-react"

type QuizStatus = "DRAFT" | "ACTIVE" | "CLOSED"

interface Quiz {
  id: string
  title: string
  subject: string
  class: string
  section: string
  status: QuizStatus
  total_marks: number
  duration_mins: number
  start_time: string
  end_time: string
  _count: { questions: number; attempts: number }
}

// Derive effectiveStatus client-side so it's always accurate regardless of when the list was fetched
function withEffectiveStatus(quiz: Quiz): Quiz & { effectiveStatus: EffectiveStatus } {
  return {
    ...quiz,
    effectiveStatus: deriveEffectiveStatus(quiz.status, quiz.start_time, quiz.end_time),
  }
}

type TabValue = "ALL" | EffectiveStatus

const FILTERS: { label: string; value: TabValue }[] = [
  { label: "All", value: "ALL" },
  { label: "Upcoming", value: "UPCOMING" },
  { label: "Live", value: "LIVE" },
  { label: "Ended", value: "ENDED" },
]

interface MyContestsSectionProps {
  detailBasePath: string
}

export function MyContestsSection({ detailBasePath }: MyContestsSectionProps) {
  const [rawQuizzes, setRawQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TabValue>("ALL")
  // Tick every 30s to recompute effectiveStatus without re-fetching
  const [tick, setTick] = useState(0)

  const fetchQuizzes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/quiz?mine=true")
      const data = await res.json()
      setRawQuizzes(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchQuizzes() }, [fetchQuizzes])

  // Recompute derived status every 30s without hitting the API
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  // Derive effectiveStatus fresh on every tick
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const quizzes = rawQuizzes.map(withEffectiveStatus)

  const filtered = filter === "ALL"
    ? quizzes
    : quizzes.filter((q) => q.effectiveStatus === filter)

  const countFor = (v: EffectiveStatus) => quizzes.filter((q) => q.effectiveStatus === v).length

  // Suppress tick warning — intentional dependency
  void tick

  return (
    <div className="space-y-4">
      {/* Filter tabs — time-based, not DB status */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              filter === f.value
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
            {f.value !== "ALL" && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({countFor(f.value as EffectiveStatus)})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Swords className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium mb-2">No contests found</p>
          <p className="text-sm">
            {filter === "ALL"
              ? "Schedule your first contest from the Arena."
              : `No ${filter.toLowerCase()} contests.`}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((quiz) => (
            <ContestCard
              key={quiz.id}
              quiz={quiz}
              detailBasePath={detailBasePath}
              onDeleted={(id) => setRawQuizzes((prev) => prev.filter((q) => q.id !== id))}
              onStatusChanged={(id, status) =>
                setRawQuizzes((prev) =>
                  prev.map((q) => (q.id === id ? { ...q, status } : q))
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
