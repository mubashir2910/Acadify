"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { BookOpen } from "lucide-react"
import type { TeacherRoutineEntry, DayOfWeek } from "@/schemas/timetable.schema"
import { ALL_DAYS, DAY_LABELS } from "@/schemas/timetable.schema"

interface RoutineResponse {
  entries: TeacherRoutineEntry[]
}

export default function MyRoutineView() {
  const [data, setData] = useState<RoutineResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch("/api/timetable/my")
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-red-500">Could not load your routine. Please refresh.</p>
  }

  if (!data || data.entries.length === 0) {
    return (
      <div className="border-2 border-dashed border-border rounded-xl p-10 text-center text-muted-foreground">
        <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No timetable assignments yet.</p>
      </div>
    )
  }

  // Group entries by day, then within each day sort by wall-clock start time
  // (because different groups may run on different schedules).
  const byDay = new Map<DayOfWeek, TeacherRoutineEntry[]>()
  for (const entry of data.entries) {
    if (!byDay.has(entry.day_of_week)) byDay.set(entry.day_of_week, [])
    byDay.get(entry.day_of_week)!.push(entry)
  }

  return (
    <div className="space-y-4">
      {ALL_DAYS.map((day) => {
        const dayEntries = byDay.get(day)
        if (!dayEntries || dayEntries.length === 0) return null

        const sorted = [...dayEntries].sort((a, b) =>
          a.period_start_time.localeCompare(b.period_start_time),
        )

        return (
          <Card key={day} className="border-0 shadow-sm bg-card">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-foreground">
                {DAY_LABELS[day]}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {sorted.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 bg-accent rounded-lg px-3 py-2.5"
                >
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium w-24 shrink-0 pt-0.5">
                    {entry.period_start_time} – {entry.period_end_time}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{entry.subject}</p>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                        {entry.group_name}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Class {entry.class} – {entry.section} · {entry.period_label}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
