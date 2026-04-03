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
        <p className="text-sm text-red-500">Could not load timetable. Please refresh.</p>
      </div>
    )
  }

  // Check if any day has any non-break non-empty cell
  const hasTimetable = days.some((d) =>
    d.cells.some((c) => !c.is_break && c.subject !== null)
  )

  if (!hasTimetable) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <h1 className="text-2xl font-bold">Timetable</h1>
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center text-muted-foreground text-sm">
          No timetable has been set up for your class yet.
        </div>
      </div>
    )
  }

  // Collect period metadata from first day (all days have same periods)
  const periods = days[0]?.cells ?? []

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Timetable</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your class schedule</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left px-3 py-2.5 font-semibold text-slate-700 border-b border-slate-200 min-w-[100px] sticky left-0 bg-slate-50 z-10">
                Day
              </th>
              {periods.map((cell) => (
                <th
                  key={cell.period_id}
                  className={cn(
                    "px-3 py-2.5 text-center border-b border-slate-200 min-w-[100px] font-semibold",
                    cell.is_break ? "bg-amber-50 text-amber-700" : "text-slate-700"
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
            {days.map((day, idx) => (
              <tr
                key={day.day}
                className={cn("border-b border-slate-100", idx % 2 === 0 ? "bg-white" : "bg-slate-50/40")}
              >
                <td
                  className={cn(
                    "px-3 py-2.5 font-semibold text-slate-700 sticky left-0 z-10 border-r border-slate-100",
                    idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                  )}
                >
                  {DAY_LABELS[day.day]}
                </td>
                {day.cells.map((cell) => {
                  if (cell.is_break) {
                    return (
                      <td key={cell.period_id} className="px-2 py-2 text-center bg-amber-50/60">
                        <span className="text-[10px] text-amber-600 font-medium">BREAK</span>
                      </td>
                    )
                  }
                  return (
                    <td key={cell.period_id} className="px-2 py-2.5 text-center">
                      {cell.subject ? (
                        <div>
                          <div className="text-xs font-semibold text-slate-800">{cell.subject}</div>
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
