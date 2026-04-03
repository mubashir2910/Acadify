"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { TeacherSelfStats } from "@/schemas/teacher-attendance.schema"

export default function TeacherSelfAttendanceStats() {
  const [stats, setStats] = useState<TeacherSelfStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch("/api/teacher-attendance/summary")
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then(setStats)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-16 rounded-xl" />
      </div>
    )
  }

  if (error || !stats) {
    return <p className="text-sm text-muted-foreground">Could not load attendance data.</p>
  }

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
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        My Attendance This Session
      </h2>

      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-green-50 border-0 shadow-none">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{stats.presentDays}</p>
            <p className="text-xs text-muted-foreground mt-1">Present</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-0 shadow-none">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-700">{stats.lateDays}</p>
            <p className="text-xs text-muted-foreground mt-1">Late</p>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-0 shadow-none">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-700">{stats.absentDays}</p>
            <p className="text-xs text-muted-foreground mt-1">Absent</p>
          </CardContent>
        </Card>
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
