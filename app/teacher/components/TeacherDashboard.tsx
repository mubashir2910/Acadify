"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import Link from "next/link"
import { DashboardGreeting } from "@/components/dashboard-greeting"
import TeacherClassInfo from "./TeacherClassInfo"
import TeacherQuickStats from "./TeacherQuickStats"
import TeacherAttendanceRadialChart from "./TeacherAttendanceRadialChart"
import TeacherSelfAttendanceStats from "./TeacherSelfAttendanceStats"
import TeacherTodaySchedule from "./TeacherTodaySchedule"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { AttendanceSummaryStats } from "@/schemas/attendance.schema"

type TeacherDashboardData =
  | { assigned: false }
  | { assigned: true; class: string; section: string; summary: AttendanceSummaryStats; isSubmitted: boolean }

export default function TeacherDashboard() {
  const { data: session } = useSession()
  const [data, setData] = useState<TeacherDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const today = format(new Date(), "yyyy-MM-dd")

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/attendance?date=${today}`)
      if (!res.ok) throw new Error("Failed to fetch")
      setData(await res.json())
    } catch {
      setError("Could not load dashboard data. Please try refreshing.")
    } finally {
      setLoading(false)
    }
  }, [today])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <DashboardGreeting
        name={session?.user?.name ?? "Teacher"}
        subtitle="Ready for class? Here's your day at a glance."
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : data ? (
        <>
          {data.assigned ? (
            <>
              <TeacherTodaySchedule title="Today's Schedule" />
              <TeacherClassInfo
                assigned={data.assigned}
                className={data.class}
                section={data.section}
              />
              <TeacherQuickStats
                summary={data.summary}
                isSubmitted={data.isSubmitted}
              />
              <div>
                <Button asChild>
                  <Link href="/teacher/class-attendance">Take Attendance</Link>
                </Button>
              </div>
              <TeacherAttendanceRadialChart
                summary={data.summary}
                isSubmitted={data.isSubmitted}
              />
              <TeacherSelfAttendanceStats />
            </>
          ) : (
            <>
              <TeacherTodaySchedule title="Today's Assigned Classes" />
              <div>
                <Button asChild>
                  <Link href="/teacher/class-attendance">Take Attendance</Link>
                </Button>
              </div>
              <TeacherSelfAttendanceStats />
            </>
          )}
        </>
      ) : null}
    </div>
  )
}
