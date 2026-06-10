"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { DataErrorState } from "@/components/ui/data-error-state"
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

  const fetchPeriods = useCallback(() => {
    setLoading(true)
    setError(false)
    fetch("/api/timetable/today")
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then(setPeriods)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchPeriods()
  }, [fetchPeriods])

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <DataErrorState
        variant="compact"
        title="Couldn't load today's schedule"
        onRetry={fetchPeriods}
      />
    )
  }

  return (
    <Card className="border border-border shadow-none rounded-xl overflow-hidden">
      <CardHeader className="px-4 py-3 bg-muted/50 border-b border-border">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {periods.length === 0 ? (
          <p className="text-sm text-muted-foreground px-4 py-6 text-center">
            No classes today.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {periods.map((period, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5",
                  idx % 2 === 0 ? "bg-card" : "bg-muted/50/40",
                )}
              >
                {/* Time */}
                <span className="text-[11px] text-muted-foreground font-medium w-[88px] shrink-0">
                  {period.startTime} – {period.endTime}
                </span>

                {/* Subject + period label + group */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-foreground">
                      {period.subject ?? "—"}
                    </span>
                    {period.groupName && (
                      <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                        {period.groupName}
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{period.label}</span>
                </div>

                {/* Class badge */}
                {period.class && period.section && (
                  <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md shrink-0">
                    {period.class}–{period.section}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
