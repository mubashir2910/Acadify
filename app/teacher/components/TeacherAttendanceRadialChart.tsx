"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardList } from "lucide-react"
import type { AttendanceSummaryStats } from "@/schemas/attendance.schema"

interface TeacherAttendanceRadialChartProps {
  summary: AttendanceSummaryStats
  isSubmitted: boolean
}

const COLORS = {
  present: "#22c55e",
  late: "#f59e0b",
  absent: "#ef4444",
}

export default function TeacherAttendanceRadialChart({ summary, isSubmitted }: TeacherAttendanceRadialChartProps) {
  if (!isSubmitted) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center text-muted-foreground">
          <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">Today&apos;s breakdown will appear here</p>
          <p className="text-xs mt-1">Take attendance to see present, late &amp; absent counts</p>
        </CardContent>
      </Card>
    )
  }

  const { totalPresent, totalLate, totalAbsent, attendanceRate } = summary
  const total = totalPresent + totalLate + totalAbsent

  if (total === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <p className="text-sm">No students recorded for today.</p>
        </CardContent>
      </Card>
    )
  }

  const data = [
    { name: "Present", value: totalPresent, color: COLORS.present },
    { name: "Late", value: totalLate, color: COLORS.late },
    { name: "Absent", value: totalAbsent, color: COLORS.absent },
  ]

  return (
    <Card className="border-0 shadow-none bg-slate-50">
      <CardHeader className="pb-0 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Today&apos;s Attendance Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="relative">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${value} students`]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-slate-800">{attendanceRate}%</span>
            <span className="text-xs text-muted-foreground">rate</span>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          {data.map((entry) => (
            <div key={entry.name} className="flex flex-col items-center gap-1 rounded-lg p-2" style={{ backgroundColor: entry.color + "18" }}>
              <span className="text-lg font-bold" style={{ color: entry.color }}>{entry.value}</span>
              <span className="text-xs text-muted-foreground">{entry.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
