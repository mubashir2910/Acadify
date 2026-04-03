"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarClock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StudentPeriodCell } from "@/schemas/timetable.schema"

export default function StudentTodaySchedule() {
  const [periods, setPeriods] = useState<StudentPeriodCell[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch("/api/timetable/today")
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then(setPeriods)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-muted-foreground">Could not load today&apos;s classes.</p>
  }

  return (
    <Card className="border border-slate-200 shadow-none rounded-xl overflow-hidden">
      <CardHeader className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-slate-500" />
          Today&apos;s Classes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {periods.length === 0 ? (
          <p className="text-sm text-muted-foreground px-4 py-6 text-center">
            No periods configured yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {periods.map((period, idx) => (
              <div
                key={period.period_id}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5",
                  period.is_break
                    ? "bg-amber-50/60"
                    : idx % 2 === 0
                    ? "bg-white"
                    : "bg-slate-50/40"
                )}
              >
                {/* Time */}
                <span className="text-[11px] text-slate-400 font-medium w-[88px] shrink-0">
                  {period.start_time} – {period.end_time}
                </span>

                {/* Period label */}
                <span className="text-xs font-medium text-slate-700 shrink-0">{period.label}</span>

                {/* Subject + teacher */}
                {period.is_break ? (
                  <span className="text-[10px] text-amber-600 font-medium">BREAK</span>
                ) : period.subject ? (
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {period.subject}
                    </span>
                    {period.teacher_name && (
                      <span className="text-[11px] text-slate-500 shrink-0">
                        {period.teacher_name}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-300 flex-1">—</span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
