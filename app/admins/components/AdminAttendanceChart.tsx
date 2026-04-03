"use client"

import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { ClassAttendanceSummary } from "@/schemas/attendance.schema"

interface AdminAttendanceChartProps {
  classes: ClassAttendanceSummary[]
}

const chartConfig = {
  attendanceRate: {
    label: "Attendance %",
    color: "hsl(221.2 83.2% 53.3%)",
  },
} satisfies ChartConfig

export default function AdminAttendanceChart({ classes }: AdminAttendanceChartProps) {
  const chartData = classes
    .filter((c) => c.totalStudents > 0)
    .map((c) => ({
      name: `${c.class}${c.section}`,
      attendanceRate: c.attendanceRate,
    }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Class-wise Attendance</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            No attendance data available for today
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => [`${value}%`, "Attendance"]}
                    />
                  }
                />
                <Bar
                  dataKey="attendanceRate"
                  fill="var(--color-attendanceRate)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={56}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
