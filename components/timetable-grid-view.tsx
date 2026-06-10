"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type {
  TimetableGrid,
  TimetableGridParticipantRow,
  PeriodRow,
  TimetableCell,
  DayOfWeek,
  BatchChange,
} from "@/schemas/timetable.schema"
import { ALL_DAYS, DAY_LABELS } from "@/schemas/timetable.schema"

/** Identity passed back to onCellClick so the modal can lock the assignee. */
export type ParticipantIdentity =
  | { kind: "teacher"; teacher_id: string; name: string }
  | { kind: "admin"; admin_user_id: string; name: string }

interface TimetableGridViewProps {
  grid: TimetableGrid
  /** When provided, non-break cells become clickable (edit mode) */
  onCellClick?: (
    period: PeriodRow,
    day: DayOfWeek,
    participant: ParticipantIdentity,
    existingCell?: TimetableCell,
    pending?: PendingCellInfo,
  ) => void
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

/** Public shape used by parents to inspect what's queued on a cell. */
export interface PendingCellInfo {
  change: BatchChange
  isCreate: boolean
  isUpdate: boolean
  isDelete: boolean
}

interface RenderHint {
  marked: boolean
  isDelete: boolean
  isCreate: boolean
  isUpdate: boolean
  /** For CREATE: render an overlay preview (since no DB cell exists yet) */
  preview?: { subject: string; class: string; section: string }
  change: BatchChange
}

function participantKey(row: TimetableGridParticipantRow): string {
  return row.kind === "teacher" ? `t:${row.teacher_id}` : `a:${row.admin_user_id}`
}

function participantIdentity(row: TimetableGridParticipantRow): ParticipantIdentity {
  return row.kind === "teacher"
    ? { kind: "teacher", teacher_id: row.teacher_id, name: row.name }
    : { kind: "admin", admin_user_id: row.admin_user_id, name: row.name }
}

/**
 * Build two lookups:
 * - `byCellId` keyed by existing DB cell id (covers UPDATE / DELETE)
 * - `byParticipantSlot` keyed by "<participantKey>__period_id__day" (covers CREATE)
 *
 * CREATE rows that target a teacher use "t:<teacher_id>"; those that target an
 * admin use "a:<admin_user_id>" — matching how rows are keyed at render time.
 */
function buildPendingIndex(pending: BatchChange[]): {
  byCellId: Map<string, RenderHint>
  byParticipantSlot: Map<string, RenderHint>
} {
  const byCellId = new Map<string, RenderHint>()
  const byParticipantSlot = new Map<string, RenderHint>()

  for (const change of pending) {
    if (change.action === "DELETE") {
      byCellId.set(change.id, {
        marked: true,
        isDelete: true,
        isCreate: false,
        isUpdate: false,
        change,
      })
    } else if (change.action === "UPDATE") {
      byCellId.set(change.id, {
        marked: true,
        isDelete: false,
        isCreate: false,
        isUpdate: true,
        change,
      })
    } else {
      // CREATE — the row identity comes from teacher_id OR admin_user_id.
      let pKey: string | null = null
      if (change.input.teacher_id) pKey = `t:${change.input.teacher_id}`
      else if (change.input.admin_user_id) pKey = `a:${change.input.admin_user_id}`
      if (!pKey) continue
      const slot = `${pKey}__${change.input.period_id}__${change.input.day_of_week}`
      byParticipantSlot.set(slot, {
        marked: true,
        isCreate: true,
        isDelete: false,
        isUpdate: false,
        preview: {
          subject: change.input.subject,
          class: change.input.class,
          section: change.input.section,
        },
        change,
      })
    }
  }

  return { byCellId, byParticipantSlot }
}

function toPublic(hint: RenderHint): PendingCellInfo {
  return {
    change: hint.change,
    isCreate: hint.isCreate,
    isUpdate: hint.isUpdate,
    isDelete: hint.isDelete,
  }
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

  const { byCellId, byParticipantSlot } = useMemo(
    () => buildPendingIndex(pendingChanges),
    [pendingChanges],
  )

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
              <th className="text-left px-3 py-2.5 font-semibold text-foreground border-b border-border min-w-[160px] sticky left-0 bg-muted/50 z-10">
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
              grid.rows.map((row, idx) => {
                const pKey = participantKey(row)
                const identity = participantIdentity(row)
                // Inactive teachers stay visible (their existing cells let admin
                // remove or reassign) but new assignments are blocked.
                const isInactiveTeacher =
                  row.kind === "teacher" && row.is_active === false
                return (
                  <tr
                    key={pKey}
                    className={cn(
                      "border-b border-border",
                      idx % 2 === 0 ? "bg-card" : "bg-muted/30",
                      isInactiveTeacher && "opacity-80",
                    )}
                  >
                    <td
                      className={cn(
                        "px-3 py-2 font-medium text-foreground sticky left-0 z-10 border-r border-border",
                        idx % 2 === 0 ? "bg-card" : "bg-muted/30",
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{row.name}</span>
                        {/* Admin badge follows the underlying SchoolUser role,
                            not which Map the row came from — so an admin who
                            was previously assigned teaching duties (and so has
                            a Teacher row) still renders the badge. */}
                        {(row.kind === "admin" ||
                          (row.kind === "teacher" && row.is_admin)) && (
                          <span className="text-[9px] font-medium uppercase tracking-wide text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 rounded px-1 py-0.5">
                            Admin
                          </span>
                        )}
                        {isInactiveTeacher && (
                          <span className="text-[9px] font-medium uppercase tracking-wide text-red-600 dark:text-red-300 bg-red-100 dark:bg-red-900/60 rounded px-1 py-0.5">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    {grid.periods.map((period) => {
                      const cellKey = `${period.id}__${selectedDay}`
                      const cell = (row.cells as Record<string, TimetableCell | null>)[
                        cellKey
                      ]

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

                      const hint =
                        (cell && byCellId.get(cell.id)) ||
                        byParticipantSlot.get(
                          `${pKey}__${period.id}__${selectedDay}`,
                        )

                      // Block new assignments on inactive teacher rows but keep
                      // existing cells clickable so admin can remove them.
                      const clickable =
                        !!onCellClick && (!isInactiveTeacher || !!cell)

                      return (
                        <td
                          key={period.id}
                          onClick={
                            clickable
                              ? () =>
                                  onCellClick?.(
                                    period,
                                    selectedDay,
                                    identity,
                                    cell ?? undefined,
                                    hint ? toPublic(hint) : undefined,
                                  )
                              : undefined
                          }
                          className={cn(
                            "px-2 py-2 text-center relative",
                            clickable && "cursor-pointer hover:bg-accent transition-colors",
                            hint?.marked &&
                              "ring-2 ring-blue-400/60 dark:ring-blue-300/40 ring-inset",
                            hint?.isDelete && "opacity-60",
                          )}
                        >
                          {hint?.marked && (
                            <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
                          )}
                          {cell ? (
                            <div className={hint?.isDelete ? "line-through" : ""}>
                              <div className="text-xs font-semibold text-foreground">
                                {cell.subject}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {cell.class}–{cell.section}
                              </div>
                            </div>
                          ) : hint?.preview ? (
                            <div>
                              <div className="text-xs font-semibold text-blue-600 dark:text-blue-300">
                                {hint.preview.subject}
                              </div>
                              <div className="text-[10px] text-blue-500/80 dark:text-blue-300/80">
                                {hint.preview.class}–{hint.preview.section}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
