"use client"

import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type {
  PeriodRow,
  TimetableCell,
  DayOfWeek,
  BatchChange,
  OverlapWarning,
} from "@/schemas/timetable.schema"
import { DAY_LABELS } from "@/schemas/timetable.schema"
import type { ClassSectionInput } from "@/schemas/timetable-group.schema"

interface Teacher {
  id: string
  employee_id: string
  user: { name: string }
}

interface AdminCandidate {
  userId: string
  name: string
}

type AssigneeOption =
  | { value: string; label: string; kind: "teacher"; teacherId: string }
  | { value: string; label: string; kind: "admin"; userId: string }

interface AssignCellModalProps {
  open: boolean
  groupId: string
  period: PeriodRow
  dayOfWeek: DayOfWeek
  existingCell?: TimetableCell
  /** Classes belonging to the currently-selected timetable group */
  groupClasses: ClassSectionInput[]
  /**
   * Called when the admin confirms — returns a BatchChange to enqueue.
   * For "remove", returns `{ action: "DELETE", id }` (existing cell only).
   * For "create", returns `{ action: "CREATE", input }`.
   * For "update", returns `{ action: "UPDATE", id, input }`.
   */
  onQueue: (change: BatchChange) => void
  onClose: () => void
}

export default function AssignCellModal({
  open,
  groupId,
  period,
  dayOfWeek,
  existingCell,
  groupClasses,
  onQueue,
  onClose,
}: AssignCellModalProps) {
  const [options, setOptions] = useState<AssigneeOption[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const [assigneeValue, setAssigneeValue] = useState(
    existingCell?.teacher_id ? `teacher:${existingCell.teacher_id}` : "",
  )
  const [subject, setSubject] = useState(existingCell?.subject ?? "")
  const [classVal, setClassVal] = useState(existingCell?.class ?? "")
  const [sectionVal, setSectionVal] = useState(existingCell?.section ?? "")
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<OverlapWarning[]>([])
  const [checkingOverlap, setCheckingOverlap] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch("/api/teachers").then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      }),
      fetch("/api/admins/teaching-eligible").then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      }),
    ])
      .then(([t, a]) => {
        const teacherOpts: AssigneeOption[] = (t as Teacher[]).map((x) => ({
          kind: "teacher",
          value: `teacher:${x.id}`,
          label: `${x.user.name} (${x.employee_id})`,
          teacherId: x.id,
        }))
        const adminOpts: AssigneeOption[] = (a as AdminCandidate[]).map((x) => ({
          kind: "admin",
          value: `admin:${x.userId}`,
          label: `${x.name} (Admin)`,
          userId: x.userId,
        }))
        setOptions([...teacherOpts, ...adminOpts])
      })
      .catch(() => setError("Failed to load teacher list"))
      .finally(() => setLoadingData(false))
  }, [])

  // Probe wall-clock overlap whenever the chosen teacher changes (admin selections
  // can't be checked without resolving them to a Teacher row first, so skipped).
  useEffect(() => {
    const [kind, id] = assigneeValue.split(":")
    if (kind !== "teacher" || !id) {
      setWarnings([])
      return
    }
    setCheckingOverlap(true)
    const params = new URLSearchParams({
      teacherId: id,
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
  }, [assigneeValue, dayOfWeek, period.start_time, period.end_time, groupId])

  function handleClassChange(cls: string) {
    setClassVal(cls)
    setSectionVal("")
  }

  const uniqueClasses = [...new Set(groupClasses.map((cs) => cs.class))].sort()
  const sectionsForClass = groupClasses
    .filter((cs) => cs.class === classVal)
    .map((cs) => cs.section)
    .sort()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!assigneeValue) return setError("Please select a teacher or admin")
    if (!subject.trim()) return setError("Subject is required")
    if (!classVal) return setError("Please select a class")
    if (!sectionVal) return setError("Please select a section")

    const opt = options.find((o) => o.value === assigneeValue)
    if (!opt) return setError("Invalid teacher selection")

    const assignee =
      opt.kind === "teacher"
        ? { teacher_id: opt.teacherId }
        : { admin_user_id: opt.userId }

    const baseInput = {
      period_id: period.id,
      day_of_week: dayOfWeek,
      subject: subject.trim(),
      class: classVal,
      section: sectionVal,
      ...assignee,
    }

    if (existingCell) {
      onQueue({ action: "UPDATE", id: existingCell.id, input: baseInput })
    } else {
      onQueue({
        action: "CREATE",
        temp_id: `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        input: baseInput,
      })
    }
    onClose()
  }

  function handleRemove() {
    if (!existingCell) return
    if (!confirm("Mark this assignment for removal? It will be deleted when you save changes.")) {
      return
    }
    onQueue({ action: "DELETE", id: existingCell.id })
    onClose()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{existingCell ? "Edit Assignment" : "Assign Class"}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          {DAY_LABELS[dayOfWeek]} · {period.label} ({period.start_time}–{period.end_time})
        </p>

        {loadingData ? (
          <p className="text-sm text-muted-foreground py-4">Loading…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Teacher / Admin</Label>
              <select
                value={assigneeValue}
                onChange={(e) => setAssigneeValue(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select teacher or admin…</option>
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

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
                <select
                  value={classVal}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select…</option>
                  {uniqueClasses.map((c) => (
                    <option key={c} value={c}>
                      Class {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Section</Label>
                <select
                  value={sectionVal}
                  onChange={(e) => setSectionVal(e.target.value)}
                  disabled={!classVal}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                >
                  <option value="">Select…</option>
                  {sectionsForClass.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
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
                      {w.existing_group_name} · {w.existing_period_label} ({w.existing_start_time}
                      –{w.existing_end_time})
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
              {existingCell && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-red-500 hover:text-red-600 border-red-200 hover:border-red-300 mr-auto"
                  onClick={handleRemove}
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
