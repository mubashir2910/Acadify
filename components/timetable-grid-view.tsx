"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { TimetableGrid, PeriodRow, TimetableCell, DayOfWeek } from "@/schemas/timetable.schema"
import { ALL_DAYS, DAY_LABELS } from "@/schemas/timetable.schema"

interface TimetableGridViewProps {
  grid: TimetableGrid
  /** When provided, clicking a non-break cell calls this handler (admin edit mode) */
  onCellClick?: (period: PeriodRow, day: DayOfWeek, existingCell?: TimetableCell) => void
  selectedDay?: DayOfWeek
  onDayChange?: (day: DayOfWeek) => void
}

const DAY_SHORT: Record<DayOfWeek, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
}

export default function TimetableGridView({
  grid,
  onCellClick,
  selectedDay: controlledDay,
  onDayChange,
}: TimetableGridViewProps) {
  const [internalDay, setInternalDay] = useState<DayOfWeek>("MONDAY")
  const selectedDay = controlledDay ?? internalDay

  function handleDayChange(day: DayOfWeek) {
    if (onDayChange) onDayChange(day)
    else setInternalDay(day)
  }

  if (grid.periods.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No periods defined yet. Add periods first.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Day selector */}
      <div className="flex gap-1 flex-wrap">
        {ALL_DAYS.map((day) => (
          <button
            key={day}
            onClick={() => handleDayChange(day)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              selectedDay === day
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {DAY_SHORT[day]}
          </button>
        ))}
      </div>

      {/* Grid table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left px-3 py-2.5 font-semibold text-slate-700 border-b border-slate-200 min-w-[140px] sticky left-0 bg-slate-50 z-10">
                Teacher
              </th>
              {grid.periods.map((period) => (
                <th
                  key={period.id}
                  className={cn(
                    "px-3 py-2.5 text-center font-semibold border-b border-slate-200 min-w-[110px]",
                    period.is_break ? "bg-amber-50 text-amber-700" : "text-slate-700"
                  )}
                >
                  <div className="text-xs font-semibold">{period.label}</div>
                  <div className="text-[10px] font-normal text-muted-foreground">
                    {period.start_time}–{period.end_time}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={grid.periods.length + 1}
                  className="text-center py-10 text-muted-foreground text-sm"
                >
                  No assignments yet for {DAY_LABELS[selectedDay]}.
                </td>
              </tr>
            ) : (
              grid.rows.map((row, idx) => (
                <tr
                  key={row.teacher_id}
                  className={cn("border-b border-slate-100", idx % 2 === 0 ? "bg-white" : "bg-slate-50/40")}
                >
                  <td className={cn(
                    "px-3 py-2 font-medium text-slate-800 sticky left-0 z-10 border-r border-slate-100",
                    idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                  )}>
                    {row.teacher_name}
                  </td>
                  {grid.periods.map((period) => {
                    const key = `${period.id}__${selectedDay}`
                    const cell = (row.cells as Record<string, TimetableCell | null>)[key]

                    if (period.is_break) {
                      return (
                        <td key={period.id} className="px-2 py-2 text-center bg-amber-50/60">
                          <span className="text-[10px] text-amber-600 font-medium">BREAK</span>
                        </td>
                      )
                    }

                    return (
                      <td
                        key={period.id}
                        onClick={() => onCellClick?.(period, selectedDay, cell ?? undefined)}
                        className={cn(
                          "px-2 py-2 text-center",
                          onCellClick && "cursor-pointer hover:bg-blue-50 transition-colors"
                        )}
                      >
                        {cell ? (
                          <div>
                            <div className="text-xs font-semibold text-slate-800">{cell.subject}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {cell.class}–{cell.section}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
