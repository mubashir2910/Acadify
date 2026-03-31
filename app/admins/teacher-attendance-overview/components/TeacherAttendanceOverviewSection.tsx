"use client"

import { useCallback, useEffect, useState, useMemo } from "react"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { AttendanceCalendar } from "@/components/attendance-calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CalendarIcon } from "lucide-react"
import { getMostRecentWorkingDay } from "@/lib/working-days"
import AttendanceSummaryCards from "@/app/admins/attendance/components/AttendanceSummaryCards"
import TeacherAttendanceTable from "./TeacherAttendanceTable"
import type { TeacherAttendanceSummaryStats, TeacherAttendanceRecord } from "@/schemas/teacher-attendance.schema"
import type { AttendanceSummaryStats } from "@/schemas/attendance.schema"
import type { CalendarDayOverride, DayType } from "@/schemas/calendar.schema"

export default function TeacherAttendanceOverviewSection() {
  const [selectedDate, setSelectedDate] = useState<Date>(() => getMostRecentWorkingDay())
  const [displayMonth, setDisplayMonth] = useState<Date>(() => getMostRecentWorkingDay())
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [summary, setSummary] = useState<TeacherAttendanceSummaryStats | null>(null)
  const [teachers, setTeachers] = useState<TeacherAttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [calendarOverrides, setCalendarOverrides] = useState<CalendarDayOverride[]>([])

  const dateStr = format(selectedDate, "yyyy-MM-dd")
  const calendarMonth = format(displayMonth, "yyyy-MM")

  const fetchCalendarOverrides = useCallback(async () => {
    try {
      const res = await fetch(`/api/calendar?month=${calendarMonth}`)
      if (res.ok) {
        const data = await res.json()
        setCalendarOverrides(data.overrides ?? [])
      }
    } catch { /* silently fail */ }
  }, [calendarMonth])

  useEffect(() => { fetchCalendarOverrides() }, [fetchCalendarOverrides])

  const dayOverrides = useMemo(() => {
    const map = new Map<string, DayType>()
    for (const o of calendarOverrides) map.set(o.date, o.type)
    return map
  }, [calendarOverrides])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/teacher-attendance?date=${dateStr}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setSummary(data.summary ?? null)
      setTeachers(data.teachers ?? [])
    } catch {
      setError("Failed to load teacher attendance data")
    } finally {
      setLoading(false)
    }
  }, [dateStr])

  useEffect(() => { fetchData() }, [fetchData])

  // Map TeacherAttendanceSummaryStats → AttendanceSummaryStats shape (reuse existing card)
  const summaryForCards: AttendanceSummaryStats | null = summary
    ? {
        totalPresent: summary.totalPresent,
        totalAbsent: summary.totalAbsent,
        totalLate: summary.totalLate,
        totalStudents: summary.totalTeachers,
        attendanceRate: summary.attendanceRate,
      }
    : null

  const calendarSidebar = (
    <AttendanceCalendar
      selectedDate={selectedDate}
      onDateChange={(date) => { setSelectedDate(date); setCalendarOpen(false) }}
      dayOverrides={dayOverrides}
      displayMonth={displayMonth}
      onMonthChange={setDisplayMonth}
    />
  )

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 space-y-6 min-w-0">
        {/* Summary cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : summaryForCards ? (
          <AttendanceSummaryCards summary={summaryForCards} />
        ) : null}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Mobile: date picker button */}
        <div className="flex items-center justify-end lg:hidden">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0">
                <CalendarIcon className="h-4 w-4" />
                {format(selectedDate, "MMM d")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="end">
              {calendarSidebar}
              <p className="text-xs text-muted-foreground text-center mt-2">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </p>
            </PopoverContent>
          </Popover>
        </div>

        {/* Table */}
        {loading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : (
          <TeacherAttendanceTable
            teachers={teachers}
            date={dateStr}
            onRefresh={fetchData}
          />
        )}
      </div>

      {/* Desktop calendar sidebar */}
      <div className="hidden lg:block lg:w-auto shrink-0">
        <Card className="sticky top-4">
          <CardContent className="p-3">
            {calendarSidebar}
            <p className="text-xs text-muted-foreground text-center mt-2">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
