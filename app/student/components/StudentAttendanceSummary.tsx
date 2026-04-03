"use client"

import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, XCircle, Clock } from "lucide-react"
import type { StudentAttendanceStats } from "@/schemas/attendance.schema"

interface StudentAttendanceSummaryProps {
  stats: StudentAttendanceStats
}

export default function StudentAttendanceSummary({ stats }: StudentAttendanceSummaryProps) {
  const cards = [
    {
      label: "Present Days",
      value: stats.presentDays,
      icon: CheckCircle,
      bg: "bg-green-50",
      iconColor: "text-green-600",
      valueColor: "text-green-700",
    },
    {
      label: "Absent Days",
      value: stats.absentDays,
      icon: XCircle,
      bg: "bg-red-50",
      iconColor: "text-red-600",
      valueColor: "text-red-700",
    },
    {
      label: "Late Days",
      value: stats.lateDays,
      icon: Clock,
      bg: "bg-amber-50",
      iconColor: "text-amber-600",
      valueColor: "text-amber-700",
    },
  ]

  const rateColor =
    stats.attendanceRate >= 80
      ? "text-green-700"
      : stats.attendanceRate >= 60
      ? "text-amber-700"
      : "text-red-700"

  const rateBg =
    stats.attendanceRate >= 80
      ? "bg-green-50"
      : stats.attendanceRate >= 60
      ? "bg-amber-50"
      : "bg-red-50"

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {cards.map((card) => (
          <Card key={card.label} className={`${card.bg} border-0 shadow-none`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
              </div>
              <p className={`text-2xl font-bold ${card.valueColor}`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className={`border-0 shadow-none ${rateBg}`}>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Overall Attendance Rate</p>
            <p className={`text-3xl font-bold mt-1 ${rateColor}`}>{stats.attendanceRate}%</p>
          </div>
          {stats.totalWorkingDays > 0 && (
            <p className="text-xs text-muted-foreground text-right">
              {stats.presentDays + stats.lateDays} of {stats.totalWorkingDays}
              <br />
              working days attended
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
