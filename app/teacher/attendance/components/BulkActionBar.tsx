"use client"

import { Check, X, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AttendanceStatus } from "@/schemas/attendance.schema"

interface BulkActionBarProps {
  onMarkAll: (status: AttendanceStatus) => void
}

// Pill-style "Mark all" bar — kept visually identical to the admin's teacher
// attendance form (TeacherAttendanceForm) so the marking experience feels the
// same whether you're marking students or staff.
export default function BulkActionBar({ onMarkAll }: BulkActionBarProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-muted/50 border p-3">
      <span className="text-xs font-medium text-muted-foreground mr-1">
        Mark all:
      </span>
      {(["PRESENT", "ABSENT", "LATE"] as const).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onMarkAll(s)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
            s === "PRESENT" && "bg-green-500/15 text-green-700 dark:text-green-400 hover:bg-green-500/25",
            s === "ABSENT" && "bg-red-500/15 text-red-700 dark:text-red-400 hover:bg-red-500/25",
            s === "LATE" && "bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25",
          )}
        >
          {s === "PRESENT" && <Check className="h-3 w-3" />}
          {s === "ABSENT" && <X className="h-3 w-3" />}
          {s === "LATE" && <Clock className="h-3 w-3" />}
          {s === "PRESENT" ? "Present" : s === "ABSENT" ? "Absent" : "Late"}
        </button>
      ))}
    </div>
  )
}
