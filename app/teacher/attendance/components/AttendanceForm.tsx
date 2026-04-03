"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { CheckSquare } from "lucide-react"
import StudentAttendanceRow from "./StudentAttendanceRow"
import BulkActionBar from "./BulkActionBar"
import SubmitConfirmationModal from "./SubmitConfirmationModal"
import type { AttendanceStatus, StudentAttendanceRecord } from "@/schemas/attendance.schema"

interface AttendanceFormProps {
  students: StudentAttendanceRecord[]
  date: string
  isSubmitted: boolean
  onSubmitSuccess: () => void
  readOnly?: boolean
}

export default function AttendanceForm({
  students,
  date,
  isSubmitted,
  onSubmitSuccess,
  readOnly = false,
}: AttendanceFormProps) {
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus | null>>(() => {
    const initial: Record<string, AttendanceStatus | null> = {}
    for (const s of students) {
      initial[s.studentId] = s.status
    }
    return initial
  })
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }))
  }

  const markAll = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceStatus | null> = {}
    for (const s of students) {
      updated[s.studentId] = status
    }
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
    setSubmitError(null)

    // Build records — unmarked students are sent as ABSENT
    const records = students.map((s) => ({
      studentId: s.studentId,
      status: attendance[s.studentId] ?? ("ABSENT" as AttendanceStatus),
    }))

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, records }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to submit attendance")
      }

      setShowConfirm(false)
      toast.success(isSubmitted ? "Attendance updated successfully" : "Attendance marked successfully")
      onSubmitSuccess()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit"
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Bulk actions */}
      {!readOnly && <BulkActionBar onMarkAll={markAll} />}

      {/* Student list */}
      <div className="space-y-2">
        {students.map((student) => (
          <StudentAttendanceRow
            key={student.studentId}
            name={student.name}
            rollNo={student.rollNo}
            profilePicture={student.profilePicture}
            status={attendance[student.studentId]}
            onStatusChange={readOnly ? undefined : (status) => updateStatus(student.studentId, status)}
          />
        ))}
      </div>

      {students.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No active students in this class.
        </p>
      )}

      {/* Submit button */}
      {!readOnly && students.length > 0 && (
        <Button
          onClick={() => setShowConfirm(true)}
          className="w-full bg-green-700 hover:bg-green-800 text-white"
          size="lg"
        >
          <CheckSquare className="h-4 w-4 mr-2" />
          {isSubmitted ? "Update Attendance" : "Submit Attendance"}
        </Button>
      )}

      {/* Confirmation modal */}
      {!readOnly && (
        <SubmitConfirmationModal
          open={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleSubmit}
          counts={counts}
          total={students.length}
          isEditing={isSubmitted}
          submitting={submitting}
        />
      )}
    </div>
  )
}
