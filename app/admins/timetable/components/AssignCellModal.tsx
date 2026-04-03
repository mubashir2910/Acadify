"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { PeriodRow, TimetableCell, DayOfWeek } from "@/schemas/timetable.schema"
import { DAY_LABELS } from "@/schemas/timetable.schema"

interface Teacher {
  id: string
  employee_id: string
  user: { name: string }
}

interface ClassSection {
  class: string
  section: string
}

interface AssignCellModalProps {
  open: boolean
  period: PeriodRow
  dayOfWeek: DayOfWeek
  existingCell?: TimetableCell
  onClose: () => void
  onSuccess: () => void
}

export default function AssignCellModal({
  open,
  period,
  dayOfWeek,
  existingCell,
  onClose,
  onSuccess,
}: AssignCellModalProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classSections, setClassSections] = useState<ClassSection[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const [teacherId, setTeacherId] = useState(existingCell?.teacher_id ?? "")
  const [subject, setSubject] = useState(existingCell?.subject ?? "")
  const [classVal, setClassVal] = useState(existingCell?.class ?? "")
  const [sectionVal, setSectionVal] = useState(existingCell?.section ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/teachers").then((r) => { if (!r.ok) throw new Error(); return r.json() }),
      fetch("/api/class-teachers/all-class-sections").then((r) => { if (!r.ok) throw new Error(); return r.json() }),
    ])
      .then(([t, cs]) => {
        setTeachers(t)
        setClassSections(cs)
      })
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoadingData(false))
  }, [])

  // When class changes, reset section
  function handleClassChange(cls: string) {
    setClassVal(cls)
    setSectionVal("")
  }

  const uniqueClasses = [...new Set(classSections.map((cs) => cs.class))].sort()
  const sectionsForClass = classSections
    .filter((cs) => cs.class === classVal)
    .map((cs) => cs.section)
    .sort()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!teacherId) return setError("Please select a teacher")
    if (!subject.trim()) return setError("Subject is required")
    if (!classVal) return setError("Please select a class")
    if (!sectionVal) return setError("Please select a section")

    setSubmitting(true)
    try {
      const isEdit = !!existingCell
      const url = "/api/timetable"
      const method = isEdit ? "PATCH" : "POST"
      const body = isEdit
        ? { id: existingCell.id, teacher_id: teacherId, subject: subject.trim(), class: classVal, section: sectionVal }
        : { period_id: period.id, day_of_week: dayOfWeek, teacher_id: teacherId, subject: subject.trim(), class: classVal, section: sectionVal }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.message ?? "Failed to save")
        return
      }

      toast.success(isEdit ? "Assignment updated" : "Assignment saved")
      onSuccess()
    } catch {
      setError("Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemove() {
    if (!existingCell) return
    if (!confirm("Remove this assignment?")) return
    setRemoving(true)
    try {
      const res = await fetch("/api/timetable", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: existingCell.id }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.message ?? "Failed to remove")
        return
      }
      toast.success("Assignment removed")
      onSuccess()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {existingCell ? "Edit Assignment" : "Assign Class"}
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          {DAY_LABELS[dayOfWeek]} · {period.label} ({period.start_time}–{period.end_time})
        </p>

        {loadingData ? (
          <p className="text-sm text-muted-foreground py-4">Loading…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Teacher</Label>
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select teacher…</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.user.name} ({t.employee_id})
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
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
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

            {error && <p className="text-sm text-red-500">{error}</p>}

            <DialogFooter className="gap-2 flex-wrap">
              {existingCell && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-red-500 hover:text-red-600 border-red-200 hover:border-red-300 mr-auto"
                  disabled={removing || submitting}
                  onClick={handleRemove}
                >
                  {removing ? "Removing…" : "Remove"}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting || removing}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || removing}>
                {submitting ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
