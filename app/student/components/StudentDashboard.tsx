"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { DashboardGreeting } from "@/components/dashboard-greeting"
import StudentAttendanceSummary from "./StudentAttendanceSummary"
import StudentTodaySchedule from "./StudentTodaySchedule"
import { Skeleton } from "@/components/ui/skeleton"
import { DataErrorState } from "@/components/ui/data-error-state"
import type { StudentAttendanceStats } from "@/schemas/attendance.schema"

export default function StudentDashboard() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<StudentAttendanceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/attendance/summary")
      if (!res.ok) throw new Error("Failed to fetch attendance summary")
      const data = await res.json()
      setStats(data)
    } catch {
      setError("Could not load attendance data. Please try refreshing.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <DashboardGreeting
        name={session?.user?.name ?? "Student"}
        subtitle="Here's your attendance overview."
      />

      {loading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
          <Skeleton className="h-14 rounded-xl" />
        </div>
      ) : error ? (
        <DataErrorState
          title="Couldn't load attendance data"
          description="Something went wrong on our side."
          onRetry={fetchStats}
        />
      ) : stats ? (
        <StudentAttendanceSummary stats={stats} />
      ) : null}

      <StudentTodaySchedule />
    </div>
  )
}
