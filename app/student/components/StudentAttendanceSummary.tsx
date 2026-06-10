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
      bg: "bg-green-500/10",
      borderColor: "border-l-green-500",
      iconColor: "text-green-600 dark:text-green-400",
      valueColor: "text-green-700 dark:text-green-400",
    },
    {
      label: "Absent Days",
      value: stats.absentDays,
      icon: XCircle,
      bg: "bg-red-500/10",
      borderColor: "border-l-red-500",
      iconColor: "text-red-600 dark:text-red-400",
      valueColor: "text-red-700 dark:text-red-400",
    },
    {
      label: "Late Days",
      value: stats.lateDays,
      icon: Clock,
      bg: "bg-amber-500/10",
      borderColor: "border-l-amber-500",
      iconColor: "text-amber-600 dark:text-amber-400",
      valueColor: "text-amber-700 dark:text-amber-400",
    },
  ]

  const rateColor =
    stats.attendanceRate >= 80
      ? "text-green-700 dark:text-green-400"
      : stats.attendanceRate >= 60
      ? "text-amber-700 dark:text-amber-400"
      : "text-red-700 dark:text-red-400"

  const rateBg =
    stats.attendanceRate >= 80
      ? "bg-green-500/10"
      : stats.attendanceRate >= 60
      ? "bg-amber-500/10"
      : "bg-red-500/10"

  const rateBorder =
    stats.attendanceRate >= 80
      ? "border-l-green-500"
      : stats.attendanceRate >= 60
      ? "border-l-amber-500"
      : "border-l-red-500"

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {cards.map((card) => (
          <Card
            key={card.label}
            className={`${card.bg} border-0 border-l-4 ${card.borderColor} rounded-l-none rounded-r-xl shadow-none`}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
              </div>
              <p className={`text-xl font-bold ${card.valueColor}`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className={`border-0 border-l-4 ${rateBorder} rounded-l-none rounded-r-xl shadow-none ${rateBg}`}>
        <CardContent className="p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Overall Attendance Rate</p>
            <p className={`text-2xl font-bold mt-1 ${rateColor}`}>{stats.attendanceRate}%</p>
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
