"use client"

import { Button } from "@/components/ui/button"
import { Check, X, Clock } from "lucide-react"
import type { AttendanceStatus } from "@/schemas/attendance.schema"

interface BulkActionBarProps {
  onMarkAll: (status: AttendanceStatus) => void
}

export default function BulkActionBar({ onMarkAll }: BulkActionBarProps) {
  return (
    <div className="flex flex-wrap gap-2 sticky top-0 z-10 bg-slate-50 py-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onMarkAll("PRESENT")}
        className="gap-1.5 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
      >
        <Check className="h-3.5 w-3.5" />
        All Present
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onMarkAll("ABSENT")}
        className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
      >
        <X className="h-3.5 w-3.5" />
        All Absent
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onMarkAll("LATE")}
        className="gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
      >
        <Clock className="h-3.5 w-3.5" />
        All Late
      </Button>
    </div>
  )
}
