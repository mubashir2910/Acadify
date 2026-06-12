"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Undo2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  PeriodRow,
  TimetableCell,
  DayOfWeek,
  BatchChange,
  OverlapWarning,
} from "@/schemas/timetable.schema"
import { DAY_LABELS } from "@/schemas/timetable.schema"
import type { ClassSectionInput } from "@/schemas/timetable-group.schema"
import type {
  ParticipantIdentity,
  PendingCellInfo,
} from "@/components/timetable-grid-view"

/** Parent receives this when admin clicks Discard / Restore. */
export type PendingDropMatcher =
  | { kind: "create"; tempId: string }
  | { kind: "update"; id: string }
  | { kind: "delete"; id: string }

interface AssignCellModalProps {
  open: boolean
  groupId: string
  period: PeriodRow
  dayOfWeek: DayOfWeek
  /** Identity of the row that was clicked — locked, not chooseable in the modal */
  participant: ParticipantIdentity
  existingCell?: TimetableCell
  /** Classes belonging to the currently-selected timetable group */
  groupClasses: ClassSectionInput[]
  /** Pending change already queued for this cell (if any) */
  pending?: PendingCellInfo
  /** Called when the admin confirms a CREATE/UPDATE/DELETE — returns a BatchChange */
  onQueue: (change: BatchChange) => void
  /** Called when the admin discards a queued change (or restores a DELETE) */
  onDropPending: (matcher: PendingDropMatcher) => void
  onClose: () => void
}

const SECTION_PLACEHOLDER = "__none__"

export default function AssignCellModal({
  open,
  groupId,
  period,
  dayOfWeek,
  participant,
  existingCell,
  groupClasses,
  pending,
  onQueue,
  onDropPending,
  onClose,
}: AssignCellModalProps) {
  // Pre-fill priority:
  // 1. Pending CREATE/UPDATE → use queued values
  // 2. Existing DB cell → use DB values
  // 3. Otherwise → empty
  const initialSubject = useMemo(() => {
    if (pending && pending.change.action !== "DELETE") {
      return pending.change.input.subject ?? existingCell?.subject ?? ""
    }
    return existingCell?.subject ?? ""
  }, [pending, existingCell])

  const initialClass = useMemo(() => {
    if (pending && pending.change.action !== "DELETE") {
      return pending.change.input.class ?? existingCell?.class ?? ""
    }
    return existingCell?.class ?? ""
  }, [pending, existingCell])

  const initialSection = useMemo(() => {
    if (pending && pending.change.action !== "DELETE") {
      return pending.change.input.section ?? existingCell?.section ?? ""
    }
    return existingCell?.section ?? ""
  }, [pending, existingCell])

  const [subject, setSubject] = useState(initialSubject)
  const [classVal, setClassVal] = useState(initialClass)
  const [sectionVal, setSectionVal] = useState(initialSection)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<OverlapWarning[]>([])
  const [checkingOverlap, setCheckingOverlap] = useState(false)

  // Reset form state on open so re-opening reflects the latest pre-fill.
  useEffect(() => {
    if (!open) return
    setSubject(initialSubject)
    setClassVal(initialClass)
    setSectionVal(initialSection)
    setError(null)
  }, [open, initialSubject, initialClass, initialSection])

  // Wall-clock overlap probe — only when the row owner is a real Teacher.
  // Admin participants have no Teacher row yet, so we can't probe; the backend
  // surfaces any post-save warnings via the batch response.
  useEffect(() => {
    if (participant.kind !== "teacher") {
      setWarnings([])
      return
    }
    setCheckingOverlap(true)
    const params = new URLSearchParams({
      teacherId: participant.teacher_id,
      day: dayOfWeek,
      start: period.start_time,
      end: period.end_time,
      excludeGroupId: groupId,
    })
    fetch(`/api/timetable/overlap-check?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setWarnings(data as OverlapWarning[]))
      .catch(() => setWarnings([]))
      .finally(() => setCheckingOverlap(false))
  }, [participant, dayOfWeek, period.start_time, period.end_time, groupId])

  // Defensive: include the existingCell's class even if it's been removed from
  // the group since the assignment was made.
  const knownGroupKey = new Set(
    groupClasses.map((cs) => `${cs.class}__${cs.section}`),
  )
  const orphanFromExisting =
    existingCell && !knownGroupKey.has(`${existingCell.class}__${existingCell.section}`)
      ? { class: existingCell.class, section: existingCell.section }
      : null

  const mergedClassMap = new Map<string, Set<string>>()
  for (const cs of groupClasses) {
    if (!mergedClassMap.has(cs.class)) mergedClassMap.set(cs.class, new Set())
    mergedClassMap.get(cs.class)!.add(cs.section)
  }
  if (orphanFromExisting) {
    if (!mergedClassMap.has(orphanFromExisting.class)) {
      mergedClassMap.set(orphanFromExisting.class, new Set())
    }
    mergedClassMap.get(orphanFromExisting.class)!.add(orphanFromExisting.section)
  }

  const uniqueClasses = [...mergedClassMap.keys()].sort()
  const sectionsForClass = [...(mergedClassMap.get(classVal) ?? [])].sort()
  const isOrphanClass = (cls: string) =>
    orphanFromExisting?.class === cls &&
    !groupClasses.some((cs) => cs.class === cls)
  const isOrphanSection = (cls: string, sec: string) =>
    orphanFromExisting?.class === cls &&
    orphanFromExisting?.section === sec &&
    !groupClasses.some((cs) => cs.class === cls && cs.section === sec)

  function handleClassChange(cls: string) {
    setClassVal(cls)
    setSectionVal("")
  }

  // ─── Action handlers ─────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!subject.trim()) return setError("Subject is required")
    if (!classVal) return setError("Please select a class")
    if (!sectionVal) return setError("Please select a section")

    const assignee =
      participant.kind === "teacher"
        ? { teacher_id: participant.teacher_id }
        : { admin_user_id: participant.admin_user_id }

    const baseInput = {
      period_id: period.id,
      day_of_week: dayOfWeek,
      subject: subject.trim(),
      class: classVal,
      section: sectionVal,
      ...assignee,
    }

    if (pending?.change.action === "CREATE") {
      // Drop the previously-queued CREATE for this slot and queue the fresh one.
      onDropPending({ kind: "create", tempId: pending.change.temp_id ?? "" })
      onQueue({
        action: "CREATE",
        temp_id: `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        input: baseInput,
      })
    } else if (existingCell) {
      // UPDATE never reassigns the teacher — drop the assignee from the input
      // so the backend keeps the existing Timetable.teacher_id.
      onQueue({
        action: "UPDATE",
        id: existingCell.id,
        input: {
          period_id: period.id,
          day_of_week: dayOfWeek,
          subject: subject.trim(),
          class: classVal,
          section: sectionVal,
        },
      })
    } else {
      onQueue({
        action: "CREATE",
        temp_id: `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        input: baseInput,
      })
    }
    onClose()
  }

  function handleQueueDelete() {
    if (!existingCell) return
    if (
      !confirm(
        "Mark this assignment for removal? It will be deleted when you save changes.",
      )
    ) {
      return
    }
    onQueue({ action: "DELETE", id: existingCell.id })
    onClose()
  }

  function handleDiscardCreate() {
    if (pending?.change.action !== "CREATE") return
    onDropPending({ kind: "create", tempId: pending.change.temp_id ?? "" })
    onClose()
  }

  function handleDiscardUpdate() {
    if (pending?.change.action !== "UPDATE") return
    onDropPending({ kind: "update", id: pending.change.id })
    onClose()
  }

  function handleRestoreDelete() {
    if (pending?.change.action !== "DELETE") return
    onDropPending({ kind: "delete", id: pending.change.id })
    onClose()
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  const title = (() => {
    if (pending?.change.action === "DELETE") return "Marked for Removal"
    if (pending?.change.action === "CREATE") return "Edit Queued Change"
    if (pending?.change.action === "UPDATE") return "Edit Queued Change"
    if (existingCell) return "Edit Assignment"
    return "Assign Class"
  })()

  const isDeleteState = pending?.change.action === "DELETE"

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="-mt-2 space-y-0.5">
          <p className="text-xs text-muted-foreground">
            {DAY_LABELS[dayOfWeek]} · {period.label} ({period.start_time}–{period.end_time})
          </p>
          <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
            {participant.name}
            {participant.kind === "admin" && (
              <span className="text-[9px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 rounded px-1 py-0.5">
                Admin
              </span>
            )}
          </p>
        </div>

        {isDeleteState && existingCell ? (
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 space-y-1">
              <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                This assignment will be removed when you save changes.
              </p>
              <p className="text-sm line-through text-red-700/80 dark:text-red-300/80">
                {existingCell.subject} · Class {existingCell.class}–{existingCell.section}
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button type="button" onClick={handleRestoreDelete} className="gap-1.5">
                <Undo2 className="h-3.5 w-3.5" />
                Restore
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="e.g. Mathematics"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Class</Label>
                <Select value={classVal || undefined} onValueChange={handleClassChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueClasses.map((c) => (
                      <SelectItem key={c} value={c}>
                        Class {c}
                        {isOrphanClass(c) ? " (no longer in group)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Section</Label>
                <Select
                  value={sectionVal || undefined}
                  onValueChange={(v) =>
                    setSectionVal(v === SECTION_PLACEHOLDER ? "" : v)
                  }
                  disabled={!classVal}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectionsForClass.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                        {isOrphanSection(classVal, s) ? " (no longer in group)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {uniqueClasses.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                No classes are assigned to this timetable group yet. Add classes from the group
                settings.
              </p>
            )}

            {warnings.length > 0 && (
              <div className="rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-2.5 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Time overlap with another group
                </div>
                <ul className="space-y-0.5 text-amber-700/90 dark:text-amber-300/90 list-disc pl-5">
                  {warnings.map((w, i) => (
                    <li key={i}>
                      {w.existing_group_name} · {w.existing_period_label} (
                      {w.existing_start_time}–{w.existing_end_time})
                    </li>
                  ))}
                </ul>
                <p className="text-amber-600/80 dark:text-amber-300/70">
                  You can still save — admins decide.
                </p>
              </div>
            )}

            {checkingOverlap && (
              <p className="text-[10px] text-muted-foreground">Checking for overlaps…</p>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <DialogFooter className="gap-2 flex-wrap">
              {pending?.change.action === "CREATE" && (
                <Button
                  type="button"
                  variant="outline"
                  className="mr-auto"
                  onClick={handleDiscardCreate}
                >
                  Discard pending
                </Button>
              )}
              {pending?.change.action === "UPDATE" && (
                <Button
                  type="button"
                  variant="outline"
                  className="mr-auto"
                  onClick={handleDiscardUpdate}
                >
                  Discard pending
                </Button>
              )}
              {existingCell && !pending && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-red-500 hover:text-red-600 border-red-200 hover:border-red-300 mr-auto"
                  onClick={handleQueueDelete}
                >
                  Remove
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Queue Change</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
