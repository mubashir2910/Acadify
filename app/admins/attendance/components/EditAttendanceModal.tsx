"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Check, X, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AttendanceStatus } from "@/schemas/attendance.schema"

interface EditAttendanceModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  studentName: string
  studentId: string
  currentStatus: AttendanceStatus | null
  date: string
}

export default function EditAttendanceModal({
  open,
  onClose,
  onSuccess,
  studentName,
  studentId,
  currentStatus,
  date,
}: EditAttendanceModalProps) {
  const [status, setStatus] = useState<AttendanceStatus | null>(currentStatus)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!status) return
    setSaving(true)
    try {
      const res = await fetch("/api/attendance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, date, status }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to update")
      }
      toast.success("Attendance updated successfully")
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setSaving(false)
    }
  }

  const options: { value: AttendanceStatus; label: string; icon: React.ReactNode; activeClass: string }[] = [
    { value: "PRESENT", label: "Present", icon: <Check className="h-4 w-4" />, activeClass: "bg-green-600 text-white shadow-sm" },
    { value: "ABSENT", label: "Absent", icon: <X className="h-4 w-4" />, activeClass: "bg-red-600 text-white shadow-sm" },
    { value: "LATE", label: "Late", icon: <Clock className="h-4 w-4" />, activeClass: "bg-amber-500 text-white shadow-sm" },
  ]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Attendance</DialogTitle>
          <p className="text-sm text-muted-foreground">{studentName}</p>
        </DialogHeader>

        <div className="flex items-center justify-center gap-3 py-4">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                status === opt.value
                  ? opt.activeClass
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={!status || saving || status === currentStatus}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
