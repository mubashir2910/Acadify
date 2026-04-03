"use client"

import { useCallback, useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import StudentSummaryCards from "@/app/student/attendance/components/StudentSummaryCards"
import TeacherSelfCalendarView from "./TeacherSelfCalendarView"
import type { TeacherSelfStats } from "@/schemas/teacher-attendance.schema"

export default function TeacherSelfAttendanceSection() {
  const [stats, setStats] = useState<TeacherSelfStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/teacher-attendance/summary")
      if (!res.ok) throw new Error("Failed to fetch")
      setStats(await res.json())
    } catch {
      setError("Failed to load attendance data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  if (!stats) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No attendance data available.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <StudentSummaryCards stats={stats} />

      {stats.sessionStartedOn ? (
        <TeacherSelfCalendarView />
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">
          Session start date not configured. Attendance calendar will be available once configured.
        </p>
      )}
    </div>
  )
}
