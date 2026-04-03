"use client"

import { Card, CardContent } from "@/components/ui/card"
import { UserCheck, UserX, Clock, Percent } from "lucide-react"
import type { AttendanceSummaryStats } from "@/schemas/attendance.schema"

interface AttendanceSummaryCardsProps {
  summary: AttendanceSummaryStats
}

export default function AttendanceSummaryCards({ summary }: AttendanceSummaryCardsProps) {
  const cards = [
    {
      label: "Total Present",
      value: summary.totalPresent,
      icon: UserCheck,
      bg: "bg-green-50",
      iconColor: "text-green-600",
      valueColor: "text-green-700",
    },
    {
      label: "Total Absent",
      value: summary.totalAbsent,
      icon: UserX,
      bg: "bg-red-50",
      iconColor: "text-red-600",
      valueColor: "text-red-700",
    },
    {
      label: "Total Late",
      value: summary.totalLate,
      icon: Clock,
      bg: "bg-amber-50",
      iconColor: "text-amber-600",
      valueColor: "text-amber-700",
    },
    {
      label: "Attendance Rate",
      value: `${summary.attendanceRate}%`,
      icon: Percent,
      bg: "bg-blue-50",
      iconColor: "text-blue-600",
      valueColor: "text-blue-700",
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card) => (
        <Card key={card.label} className={`${card.bg} border-0 shadow-none`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`h-4 w-4 ${card.iconColor}`} />
              <span className="text-xs font-medium text-muted-foreground">
                {card.label}
              </span>
            </div>
            <p className={`text-2xl font-bold ${card.valueColor}`}>
              {card.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
