"use client"

import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, XCircle, Clock } from "lucide-react"
import type { StudentAttendanceStats } from "@/schemas/attendance.schema"

interface StudentSummaryCardsProps {
  stats: StudentAttendanceStats
}

export default function StudentSummaryCards({ stats }: StudentSummaryCardsProps) {
  const cards = [
    {
      label: "Present",
      sublabel: `${stats.presentDays} days`,
      value: stats.presentDays,
      icon: CheckCircle,
      bg: "bg-green-50",
      iconColor: "text-green-600",
      valueColor: "text-green-700",
    },
    {
      label: "Absent",
      sublabel: `${stats.absentDays} days`,
      value: stats.absentDays,
      icon: XCircle,
      bg: "bg-red-50",
      iconColor: "text-red-600",
      valueColor: "text-red-700",
    },
    {
      label: "Late",
      sublabel: `${stats.lateDays} days`,
      value: stats.lateDays,
      icon: Clock,
      bg: "bg-amber-50",
      iconColor: "text-amber-600",
      valueColor: "text-amber-700",
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {cards.map((card) => (
          <Card key={card.label} className={`${card.bg} border-0 shadow-none`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                <span className="text-xs font-medium text-muted-foreground">
                  {card.sublabel}
                </span>
              </div>
              <p className={`text-3xl font-bold ${card.valueColor}`}>
                {card.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overall rate */}
      <div className="flex flex-col items-center justify-center gap-1 text-sm text-muted-foreground">
        <span>
          Overall Attendance Rate:{" "}
          <strong className="text-foreground">{stats.attendanceRate}%</strong>
        </span>

        {stats.totalWorkingDays > 0 && (
          <span>({stats.totalWorkingDays} working days)</span>
        )}
      </div>
    </div>
  )
}
