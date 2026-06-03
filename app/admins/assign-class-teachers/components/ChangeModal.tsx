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

interface AvailableAdmin {
  userId: string
  name: string
}

interface AssignedClass {
  class: string
  section: string
  teacher: {
    id: string
    user: { name: string }
  }
}

type AssigneeOption =
  | { kind: "teacher"; id: string; label: string }
  | { kind: "admin"; userId: string; label: string }

interface ChangeModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function ChangeModal({ onClose, onSuccess }: ChangeModalProps) {
  const [options, setOptions] = useState<AssigneeOption[]>([])
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([])
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedAssignee, setSelectedAssignee] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    Promise.all([
      fetch("/api/class-teachers/available-teachers", { signal }).then((r) => r.json()),
      fetch("/api/class-teachers/available-admins", { signal }).then((r) => r.json()),
      fetch("/api/class-teachers/assigned-classes", { signal }).then((r) => r.json()),
    ])
      .then(([t, a, c]) => {
        const teacherOpts: AssigneeOption[] = (t as AvailableTeacher[]).map(
          (x) => ({
            kind: "teacher",
            id: x.id,
            label: `${x.user.name} (${x.employee_id})`,
          }),
        )
        const adminOpts: AssigneeOption[] = (a as AvailableAdmin[]).map((x) => ({
          kind: "admin",
          userId: x.userId,
          label: `${x.name} (Admin)`,
        }))
        setOptions([...teacherOpts, ...adminOpts])
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
    if (!selectedClass || !selectedAssignee) return
    setSubmitting(true)
    setServerError(null)

    const [cls, sec] = selectedClass.split("|")
    const [kind, id] = selectedAssignee.split(":")
    const body =
      kind === "admin"
        ? { class: cls, section: sec, adminUserId: id }
        : { class: cls, section: sec, teacherId: id }

    try {
      const res = await fetch("/api/class-teachers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
                  setSelectedAssignee("")
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

            {/* New assignee dropdown (teachers + admins) */}
            <div className="space-y-1.5">
              <Label>New Class Teacher</Label>
              <Select
                value={selectedAssignee}
                onValueChange={setSelectedAssignee}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select new teacher or admin" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((opt) => {
                    const value =
                      opt.kind === "teacher"
                        ? `teacher:${opt.id}`
                        : `admin:${opt.userId}`
                    return (
                      <SelectItem key={value} value={value}>
                        {opt.label}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {options.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No available teachers or admins.
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
                disabled={!selectedClass || !selectedAssignee}
                loading={submitting}
                loadingText="Changing..."
              >
                Change
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
