"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Users, ClipboardCheck } from "lucide-react"
import type { AttendanceSummaryStats } from "@/schemas/attendance.schema"

interface TeacherQuickStatsProps {
  summary: AttendanceSummaryStats
  isSubmitted: boolean
}

export default function TeacherQuickStats({ summary, isSubmitted }: TeacherQuickStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="bg-slate-50 border-0 shadow-none">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-slate-600" />
            <span className="text-xs font-medium text-muted-foreground">Students in Class</span>
          </div>
          <p className="text-2xl font-bold text-slate-700">{summary.totalStudents}</p>
        </CardContent>
      </Card>

      <Card className={`border-0 shadow-none ${isSubmitted ? "bg-green-50" : "bg-amber-50"}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardCheck className={`h-4 w-4 ${isSubmitted ? "text-green-600" : "text-amber-600"}`} />
            <span className="text-xs font-medium text-muted-foreground">Today&apos;s Attendance</span>
          </div>
          <p className={`text-base font-bold ${isSubmitted ? "text-green-700" : "text-amber-700"}`}>
            {isSubmitted ? "Submitted" : "Not yet submitted"}
          </p>
          {isSubmitted && (
            <p className="text-xs text-muted-foreground mt-1">{summary.attendanceRate}% rate</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
