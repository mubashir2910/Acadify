"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type {
  TimetableGrid,
  PeriodRow,
  TimetableCell,
  DayOfWeek,
  BatchChange,
} from "@/schemas/timetable.schema"
import { ALL_DAYS, DAY_LABELS } from "@/schemas/timetable.schema"

interface TimetableGridViewProps {
  grid: TimetableGrid
  /** When provided, non-break cells become clickable (edit mode) */
  onCellClick?: (period: PeriodRow, day: DayOfWeek, existingCell?: TimetableCell) => void
  selectedDay?: DayOfWeek
  onDayChange?: (day: DayOfWeek) => void
  /** Pending unsaved changes — overlay markers on affected cells */
  pendingChanges?: BatchChange[]
  /** External controls (group selector, edit toggle) rendered above the day strip */
  toolbarRight?: React.ReactNode
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

interface PendingForCell {
  marked: boolean
  isDelete: boolean
  isCreate: boolean
  isUpdate: boolean
  /** For CREATE changes: render an overlay preview (since no DB cell exists yet) */
  preview?: { teacher_id: string; subject: string; class: string; section: string }
}

/**
 * Build a fast lookup: for each (teacher_id, period_id, day_of_week) — does the
 * pending queue mention it, and how should we render it?
 *
 * - CREATE: index by (resolved teacher_id, period_id, day) — preview shown.
 * - UPDATE: keyed by existing entry id; we look up via cellById below.
 * - DELETE: keyed by existing entry id.
 */
function buildPendingIndex(
  pending: BatchChange[],
  grid: TimetableGrid,
): {
  byCellId: Map<string, PendingForCell>
  byTeacherSlot: Map<string, PendingForCell>
} {
  const byCellId = new Map<string, PendingForCell>()
  const byTeacherSlot = new Map<string, PendingForCell>()

  for (const change of pending) {
    if (change.action === "DELETE") {
      byCellId.set(change.id, { marked: true, isDelete: true, isCreate: false, isUpdate: false })
    } else if (change.action === "UPDATE") {
      byCellId.set(change.id, { marked: true, isDelete: false, isCreate: false, isUpdate: true })
    } else if (change.action === "CREATE") {
      // teacher_id may be unresolved (admin_user_id) — UI maps that out before queuing
      // so we expect teacher_id to be present here in most cases.
      const teacherKey = change.input.teacher_id
      if (!teacherKey) continue
      const key = `${teacherKey}__${change.input.period_id}__${change.input.day_of_week}`
      byTeacherSlot.set(key, {
        marked: true,
        isDelete: false,
        isCreate: true,
        isUpdate: false,
        preview: {
          teacher_id: teacherKey,
          subject: change.input.subject,
          class: change.input.class,
          section: change.input.section,
        },
      })
    }
  }

  return { byCellId, byTeacherSlot }
}

export default function TimetableGridView({
  grid,
  onCellClick,
  selectedDay: controlledDay,
  onDayChange,
  pendingChanges = [],
  toolbarRight,
}: TimetableGridViewProps) {
  const [internalDay, setInternalDay] = useState<DayOfWeek>("MONDAY")
  const selectedDay = controlledDay ?? internalDay

  function handleDayChange(day: DayOfWeek) {
    if (onDayChange) onDayChange(day)
    else setInternalDay(day)
  }

  if (grid.periods.length === 0) {
    return (
      <div className="space-y-4">
        {toolbarRight && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div />
            <div className="flex items-center gap-2">{toolbarRight}</div>
          </div>
        )}
        <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed border-border rounded-xl">
          No periods defined yet for this group. Open Edit Mode and add a period to get started.
        </div>
      </div>
    )
  }

  const { byCellId, byTeacherSlot } = buildPendingIndex(pendingChanges, grid)

  return (
    <div className="space-y-4">
      {/* Toolbar row: day strip on left, group/edit controls on right */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {ALL_DAYS.map((day) => (
            <button
              key={day}
              onClick={() => handleDayChange(day)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                selectedDay === day
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {DAY_SHORT[day]}
            </button>
          ))}
        </div>
        {toolbarRight && <div className="flex items-center gap-2">{toolbarRight}</div>}
      </div>

      {/* Grid table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-3 py-2.5 font-semibold text-foreground border-b border-border min-w-[140px] sticky left-0 bg-muted/50 z-10">
                Teacher
              </th>
              {grid.periods.map((period) => (
                <th
                  key={period.id}
                  className={cn(
                    "px-3 py-2.5 text-center font-semibold border-b border-border min-w-[110px]",
                    period.is_break
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "text-foreground",
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
                  className={cn(
                    "border-b border-border",
                    idx % 2 === 0 ? "bg-card" : "bg-muted/30",
                  )}
                >
                  <td
                    className={cn(
                      "px-3 py-2 font-medium text-foreground sticky left-0 z-10 border-r border-border",
                      idx % 2 === 0 ? "bg-card" : "bg-muted/30",
                    )}
                  >
                    {row.teacher_name}
                  </td>
                  {grid.periods.map((period) => {
                    const key = `${period.id}__${selectedDay}`
                    const cell = (row.cells as Record<string, TimetableCell | null>)[key]

                    if (period.is_break) {
                      return (
                        <td
                          key={period.id}
                          className="px-2 py-2 text-center bg-amber-500/10"
                        >
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            BREAK
                          </span>
                        </td>
                      )
                    }

                    // Pending state lookup
                    let pending: PendingForCell | undefined
                    if (cell) {
                      pending = byCellId.get(cell.id)
                    } else {
                      pending = byTeacherSlot.get(
                        `${row.teacher_id}__${period.id}__${selectedDay}`,
                      )
                    }

                    return (
                      <td
                        key={period.id}
                        onClick={() => onCellClick?.(period, selectedDay, cell ?? undefined)}
                        className={cn(
                          "px-2 py-2 text-center relative",
                          onCellClick && "cursor-pointer hover:bg-accent transition-colors",
                          pending?.marked &&
                            "ring-2 ring-blue-400/60 dark:ring-blue-300/40 ring-inset",
                          pending?.isDelete && "opacity-60",
                        )}
                      >
                        {pending?.marked && (
                          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
                        )}
                        {cell ? (
                          <div className={pending?.isDelete ? "line-through" : ""}>
                            <div className="text-xs font-semibold text-foreground">
                              {cell.subject}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {cell.class}–{cell.section}
                            </div>
                          </div>
                        ) : pending?.preview ? (
                          <div>
                            <div className="text-xs font-semibold text-blue-600 dark:text-blue-300">
                              {pending.preview.subject}
                            </div>
                            <div className="text-[10px] text-blue-500/80 dark:text-blue-300/80">
                              {pending.preview.class}–{pending.preview.section}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
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
