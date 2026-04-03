"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"

interface AvailableTeacher {
  id: string
  employee_id: string
  user: { name: string }
}

interface ClassSection {
  class: string
  section: string
}

interface GiveAttendanceAccessModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function GiveAttendanceAccessModal({ onClose, onSuccess }: GiveAttendanceAccessModalProps) {
  const [teachers, setTeachers] = useState<AvailableTeacher[]>([])
  const [classes, setClasses] = useState<ClassSection[]>([])
  const [selectedTeacherId, setSelectedTeacherId] = useState("")
  const [selectedClass, setSelectedClass] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/class-teachers/available-teachers").then((r) => r.json()),
      fetch("/api/class-teachers/all-class-sections").then((r) => r.json()),
    ])
      .then(([t, c]) => {
        setTeachers(t)
        setClasses(c)
        setLoadingData(false)
      })
      .catch(() => {
        setServerError("Failed to load data")
        setLoadingData(false)
      })
  }, [])

  async function handleSubmit() {
    if (!selectedTeacherId || !selectedClass || !startDate || !endDate) return
    if (startDate > endDate) {
      setServerError("End date must be on or after start date.")
      return
    }

    setSubmitting(true)
    setServerError(null)

    const [cls, sec] = selectedClass.split("|")

    try {
      const res = await fetch("/api/attendance-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: selectedTeacherId,
          class: cls,
          section: sec,
          startDate,
          endDate,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setServerError(data.message ?? "Failed to grant access")
        setSubmitting(false)
        return
      }

      onSuccess()
    } catch {
      setServerError("Network error — please try again")
      setSubmitting(false)
    }
  }

  const canSubmit = !!selectedTeacherId && !!selectedClass && !!startDate && !!endDate && !submitting

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Give Attendance Access</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Grant a subject teacher temporary access to mark attendance for a class.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-2xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {loadingData ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Teacher dropdown */}
            <div className="space-y-1.5">
              <Label>Substitute Teacher</Label>
              <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.user.name} ({t.employee_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {teachers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No eligible subject teachers found (all teachers are already class teachers).
                </p>
              )}
            </div>

            {/* Class dropdown */}
            <div className="space-y-1.5">
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cs) => (
                    <SelectItem key={`${cs.class}|${cs.section}`} value={`${cs.class}|${cs.section}`}>
                      Class {cs.class} - {cs.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Start Date</Label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">End Date</Label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              For a single day, set both dates to the same date.
            </p>

            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={!canSubmit}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Granting...
                  </>
                ) : (
                  "Grant Access"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
