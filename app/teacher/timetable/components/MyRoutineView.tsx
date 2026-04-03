"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { BookOpen } from "lucide-react"
import type { TimetableCell, PeriodRow, DayOfWeek } from "@/schemas/timetable.schema"
import { ALL_DAYS, DAY_LABELS } from "@/schemas/timetable.schema"

interface RoutineData {
  periods: PeriodRow[]
  entries: TimetableCell[]
}

export default function MyRoutineView() {
  const [data, setData] = useState<RoutineData | null>(null)
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
      <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center text-muted-foreground">
        <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No timetable assignments yet.</p>
      </div>
    )
  }

  // Group entries by day
  const byDay = new Map<DayOfWeek, TimetableCell[]>()
  for (const entry of data.entries) {
    if (!byDay.has(entry.day_of_week)) byDay.set(entry.day_of_week, [])
    byDay.get(entry.day_of_week)!.push(entry)
  }

  // Get period label/time by id
  const periodMap = new Map(data.periods.map((p) => [p.id, p]))

  return (
    <div className="space-y-4">
      {ALL_DAYS.map((day) => {
        const dayEntries = byDay.get(day)
        if (!dayEntries || dayEntries.length === 0) return null

        // Sort entries by period order
        const sorted = [...dayEntries].sort((a, b) => {
          const pa = periodMap.get(a.period_id)
          const pb = periodMap.get(b.period_id)
          return (pa?.order ?? 0) - (pb?.order ?? 0)
        })

        return (
          <Card key={day} className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-slate-700">{DAY_LABELS[day]}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {sorted.map((entry) => {
                const period = periodMap.get(entry.period_id)
                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 bg-blue-50 rounded-lg px-3 py-2.5"
                  >
                    <div className="text-xs text-blue-600 font-medium w-24 shrink-0 pt-0.5">
                      {period ? `${period.start_time} – ${period.end_time}` : ""}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{entry.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        Class {entry.class} – {entry.section}
                        {period && ` · ${period.label}`}
                      </p>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
