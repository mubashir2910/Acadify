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

interface AssignedClass {
  class: string
  section: string
  teacher: {
    id: string
    user: { name: string }
  }
}

interface ChangeModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function ChangeModal({ onClose, onSuccess }: ChangeModalProps) {
  const [teachers, setTeachers] = useState<AvailableTeacher[]>([])
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([])
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedTeacherId, setSelectedTeacherId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    Promise.all([
      fetch("/api/class-teachers/available-teachers", { signal }).then((r) => r.json()),
      fetch("/api/class-teachers/assigned-classes", { signal }).then((r) => r.json()),
    ])
      .then(([t, c]) => {
        setTeachers(t)
        setAssignedClasses(c)
        setLoadingData(false)
      })
      .catch((err) => {
        if (err.name === "AbortError") return
        setServerError("Failed to load data")
        setLoadingData(false)
      })

    return () => controller.abort()
  }, [])

  // Find the current teacher for the selected class
  const currentTeacher = assignedClasses.find(
    (ac) => `${ac.class}|${ac.section}` === selectedClass
  )?.teacher

  async function handleSubmit() {
    if (!selectedClass || !selectedTeacherId) return
    setSubmitting(true)
    setServerError(null)

    const [cls, sec] = selectedClass.split("|")

    try {
      const res = await fetch("/api/class-teachers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class: cls,
          section: sec,
          newTeacherId: selectedTeacherId,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setServerError(data.message ?? "Failed to change assignment")
        setSubmitting(false)
        return
      }

      onSuccess()
    } catch {
      setServerError("Network error — please try again")
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Change Class Teacher</h2>
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
            {/* Class dropdown — only assigned classes */}
            <div className="space-y-1.5">
              <Label>Class - Section</Label>
              <Select
                value={selectedClass}
                onValueChange={(val) => {
                  setSelectedClass(val)
                  setSelectedTeacherId("")
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {assignedClasses.map((ac) => (
                    <SelectItem
                      key={`${ac.class}|${ac.section}`}
                      value={`${ac.class}|${ac.section}`}
                    >
                      Class {ac.class} - {ac.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Show current teacher */}
            {currentTeacher && (
              <p className="text-sm text-muted-foreground">
                Current teacher:{" "}
                <span className="font-medium text-foreground">
                  {currentTeacher.user.name}
                </span>
              </p>
            )}

            {/* New teacher dropdown */}
            <div className="space-y-1.5">
              <Label>New Teacher</Label>
              <Select
                value={selectedTeacherId}
                onValueChange={setSelectedTeacherId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select new teacher" />
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
                  No available teachers. All are already assigned.
                </p>
              )}
            </div>

            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={
                  submitting || !selectedClass || !selectedTeacherId
                }
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Changing...
                  </>
                ) : (
                  "Change"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
