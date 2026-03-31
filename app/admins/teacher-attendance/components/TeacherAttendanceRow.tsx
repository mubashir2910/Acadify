"use client"

import { Check, X, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE"

interface TeacherAttendanceRowProps {
  name: string
  employeeId: string
  profilePicture: string | null
  status: AttendanceStatus | null
  onStatusChange?: (status: AttendanceStatus) => void
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

export default function TeacherAttendanceRow({
  name,
  employeeId,
  profilePicture,
  status,
  onStatusChange,
}: TeacherAttendanceRowProps) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white border p-3 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {profilePicture ? (
          <img src={profilePicture} alt={name} className="h-9 w-9 rounded-full object-cover shrink-0" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
            {getInitials(name)}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-muted-foreground">{employeeId}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onStatusChange?.("PRESENT")}
          disabled={!onStatusChange}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
            status === "PRESENT" ? "bg-green-600 text-white shadow-sm" : "bg-slate-100 text-slate-500",
            onStatusChange && status !== "PRESENT" && "hover:bg-green-50 hover:text-green-600",
            !onStatusChange && "cursor-default opacity-70"
          )}
          aria-label="Present"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onStatusChange?.("ABSENT")}
          disabled={!onStatusChange}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
            status === "ABSENT" ? "bg-red-600 text-white shadow-sm" : "bg-slate-100 text-slate-500",
            onStatusChange && status !== "ABSENT" && "hover:bg-red-50 hover:text-red-600",
            !onStatusChange && "cursor-default opacity-70"
          )}
          aria-label="Absent"
        >
          <X className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onStatusChange?.("LATE")}
          disabled={!onStatusChange}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
            status === "LATE" ? "bg-amber-500 text-white shadow-sm" : "bg-slate-100 text-slate-500",
            onStatusChange && status !== "LATE" && "hover:bg-amber-50 hover:text-amber-600",
            !onStatusChange && "cursor-default opacity-70"
          )}
          aria-label="Late"
        >
          <Clock className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
