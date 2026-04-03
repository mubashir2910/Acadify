"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { CheckSquare, Check, X, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import TeacherAttendanceRow from "./TeacherAttendanceRow"
import SubmitConfirmationModal from "@/app/teacher/attendance/components/SubmitConfirmationModal"
import type { TeacherAttendanceRecord } from "@/schemas/teacher-attendance.schema"

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE"

interface TeacherAttendanceFormProps {
  teachers: TeacherAttendanceRecord[]
  date: string
  isSubmitted: boolean
  onSubmitSuccess: () => void
  readOnly?: boolean
}

export default function TeacherAttendanceForm({
  teachers,
  date,
  isSubmitted,
  onSubmitSuccess,
  readOnly = false,
}: TeacherAttendanceFormProps) {
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus | null>>(() => {
    const initial: Record<string, AttendanceStatus | null> = {}
    for (const t of teachers) initial[t.teacherId] = t.status
    return initial
  })
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const updateStatus = (teacherId: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({ ...prev, [teacherId]: status }))
  }

  const markAll = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceStatus | null> = {}
    for (const t of teachers) updated[t.teacherId] = status
    setAttendance(updated)
  }

  const counts = {
    present: Object.values(attendance).filter((v) => v === "PRESENT").length,
    absent: Object.values(attendance).filter((v) => v === "ABSENT").length,
    late: Object.values(attendance).filter((v) => v === "LATE").length,
    unmarked: Object.values(attendance).filter((v) => v === null).length,
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const records = teachers.map((t) => ({
        teacherId: t.teacherId,
        status: attendance[t.teacherId] ?? ("ABSENT" as AttendanceStatus),
      }))
      const res = await fetch("/api/teacher-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, records }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to submit")
      }
      setShowConfirm(false)
      toast.success(isSubmitted ? "Attendance updated successfully" : "Attendance marked successfully")
      onSubmitSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Bulk action bar */}
      {!readOnly && (
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 border p-3">
          <span className="text-xs font-medium text-muted-foreground mr-1">Mark all:</span>
          {(["PRESENT", "ABSENT", "LATE"] as AttendanceStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => markAll(s)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                s === "PRESENT" && "bg-green-100 text-green-700 hover:bg-green-200",
                s === "ABSENT"  && "bg-red-100 text-red-700 hover:bg-red-200",
                s === "LATE"    && "bg-amber-100 text-amber-700 hover:bg-amber-200"
              )}
            >
              {s === "PRESENT" && <Check className="h-3 w-3" />}
              {s === "ABSENT"  && <X className="h-3 w-3" />}
              {s === "LATE"    && <Clock className="h-3 w-3" />}
              {s === "PRESENT" ? "Present" : s === "ABSENT" ? "Absent" : "Late"}
            </button>
          ))}
        </div>
      )}

      {/* Teacher list */}
      <div className="space-y-2">
        {teachers.map((teacher) => (
          <TeacherAttendanceRow
            key={teacher.teacherId}
            name={teacher.name}
            employeeId={teacher.employeeId}
            profilePicture={teacher.profilePicture}
            status={attendance[teacher.teacherId]}
            onStatusChange={readOnly ? undefined : (status) => updateStatus(teacher.teacherId, status)}
          />
        ))}
      </div>

      {teachers.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No active teachers found.
        </p>
      )}

      {!readOnly && teachers.length > 0 && (
        <Button
          onClick={() => setShowConfirm(true)}
          className="w-full bg-green-700 hover:bg-green-800 text-white"
          size="lg"
        >
          <CheckSquare className="h-4 w-4 mr-2" />
          {isSubmitted ? "Update Attendance" : "Submit Attendance"}
        </Button>
      )}

      {!readOnly && (
        <SubmitConfirmationModal
          open={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleSubmit}
          counts={counts}
          total={teachers.length}
          isEditing={isSubmitted}
          submitting={submitting}
        />
      )}
    </div>
  )
}
