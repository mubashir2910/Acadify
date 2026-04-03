"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarClock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TeacherTodayPeriod } from "@/schemas/timetable.schema"

interface TeacherTodayScheduleProps {
  title: string
}

export default function TeacherTodaySchedule({ title }: TeacherTodayScheduleProps) {
  const [periods, setPeriods] = useState<TeacherTodayPeriod[]>([])
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
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-muted-foreground">Could not load today&apos;s schedule.</p>
  }

  return (
    <Card className="border border-slate-200 shadow-none rounded-xl overflow-hidden">
      <CardHeader className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-slate-500" />
          {title}
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
                key={idx}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5",
                  period.isBreak ? "bg-amber-50/60" : idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                )}
              >
                {/* Time */}
                <span className="text-[11px] text-slate-400 font-medium w-[88px] shrink-0">
                  {period.startTime} – {period.endTime}
                </span>

                {/* Period label + subject */}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-slate-700">{period.label}</span>
                  {!period.isBreak && period.subject && (
                    <span className="text-xs text-slate-500 ml-1.5">· {period.subject}</span>
                  )}
                  {period.isBreak && (
                    <span className="text-[10px] text-amber-600 font-medium ml-1.5">BREAK</span>
                  )}
                </div>

                {/* Class badge */}
                {!period.isBreak && period.class && period.section && (
                  <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                    {period.class}–{period.section}
                  </span>
                )}
                {!period.isBreak && !period.subject && (
                  <span className="text-xs text-slate-300">—</span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
