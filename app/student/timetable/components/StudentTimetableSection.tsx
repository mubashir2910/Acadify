"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { StudentTimetableDay, PeriodRow } from "@/schemas/timetable.schema"
import { DAY_LABELS } from "@/schemas/timetable.schema"

export default function StudentTimetableSection() {
  const [days, setDays] = useState<StudentTimetableDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch("/api/timetable")
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then(setDays)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-sm text-destructive">Could not load timetable. Please refresh.</p>
      </div>
    )
  }

  // Hide days that have no real assignments (Sunday is gone in most schools).
  // Break-only days stay because that's still a valid school day. If every day
  // is empty we fall through to the "no timetable" banner.
  const visibleDays = days.filter((d) =>
    d.cells.some((c) => c.subject !== null || c.is_break),
  )

  if (visibleDays.length === 0) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <h1 className="text-2xl font-bold">Timetable</h1>
        <div className="border-2 border-dashed border-border rounded-xl p-10 text-center text-muted-foreground text-sm">
          No timetable has been set up for your class yet.
        </div>
      </div>
    )
  }

  // Collect period metadata from first visible day (all days share the same periods)
  const periods = visibleDays[0]?.cells ?? []

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Timetable</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your class schedule</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-3 py-2.5 font-semibold text-foreground border-b border-border min-w-[100px] sticky left-0 bg-muted/50 z-10">
                Day
              </th>
              {periods.map((cell) => (
                <th
                  key={cell.period_id}
                  className={cn(
                    "px-3 py-2.5 text-center border-b border-border min-w-[100px] font-semibold",
                    cell.is_break ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" : "text-foreground"
                  )}
                >
                  <div className="text-xs font-semibold">{cell.label}</div>
                  <div className="text-[10px] font-normal text-muted-foreground">
                    {cell.start_time}–{cell.end_time}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleDays.map((day, idx) => (
              <tr
                key={day.day}
                className={cn("border-b border-border", idx % 2 === 0 ? "bg-card" : "bg-muted/50/40")}
              >
                <td
                  className={cn(
                    "px-3 py-2.5 font-semibold text-foreground sticky left-0 z-10 border-r border-border",
                    idx % 2 === 0 ? "bg-card" : "bg-muted/50/40"
                  )}
                >
                  {DAY_LABELS[day.day]}
                </td>
                {day.cells.map((cell) => {
                  if (cell.is_break) {
                    return (
                      <td key={cell.period_id} className="px-2 py-2 text-center bg-amber-500/10/60">
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">BREAK</span>
                      </td>
                    )
                  }
                  return (
                    <td key={cell.period_id} className="px-2 py-2.5 text-center">
                      {cell.subject ? (
                        <div>
                          <div className="text-xs font-semibold text-foreground">{cell.subject}</div>
                          {cell.teacher_name && (
                            <div className="text-[10px] text-muted-foreground">{cell.teacher_name}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
