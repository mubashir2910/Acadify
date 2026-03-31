"use client"

import { useCallback, useEffect, useState, useMemo } from "react"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { AttendanceCalendar } from "@/components/attendance-calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CalendarCheck, CalendarIcon, Info, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import { getMostRecentWorkingDay, getWeekStart } from "@/lib/working-days"
import AttendanceForm from "./AttendanceForm"
import TeacherAttendanceHistory from "./TeacherAttendanceHistory"
import type { StudentAttendanceRecord, AttendanceSummaryStats } from "@/schemas/attendance.schema"
import type { CalendarDayOverride, DayType } from "@/schemas/calendar.schema"

type TabType = "mark" | "history"

interface ClassData {
  assigned: boolean
  class?: string
  section?: string
  schoolId?: string
  summary?: AttendanceSummaryStats
  students?: StudentAttendanceRecord[]
  isSubmitted?: boolean
}

export default function TeacherAttendanceSection() {
  const [activeTab, setActiveTab] = useState<TabType>("mark")
  const [selectedDate, setSelectedDate] = useState<Date>(() => getMostRecentWorkingDay())
  const [displayMonth, setDisplayMonth] = useState<Date>(() => getMostRecentWorkingDay())
  const [classData, setClassData] = useState<ClassData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [calendarOverrides, setCalendarOverrides] = useState<CalendarDayOverride[]>([])

  const dateStr = format(selectedDate, "yyyy-MM-dd")
  const calendarMonth = format(displayMonth, "yyyy-MM")

  // Fetch calendar overrides for the selected month
  const fetchCalendarOverrides = useCallback(async () => {
    try {
      const res = await fetch(`/api/calendar?month=${calendarMonth}`)
      if (res.ok) {
        const data = await res.json()
        setCalendarOverrides(data.overrides ?? [])
      }
    } catch {
      // Silently fail
    }
  }, [calendarMonth])

  useEffect(() => {
    fetchCalendarOverrides()
  }, [fetchCalendarOverrides])

  // Build dayOverrides map for the calendar
  const dayOverrides = useMemo(() => {
    const map = new Map<string, DayType>()
    for (const o of calendarOverrides) {
      map.set(o.date, o.type)
    }
    return map
  }, [calendarOverrides])

  const fetchAttendance = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/attendance?date=${dateStr}`)
      if (!res.ok) {
        throw new Error("Failed to fetch attendance")
      }
      const data = await res.json()
      setClassData(data)
    } catch {
      setError("Failed to load attendance data")
    } finally {
      setLoading(false)
    }
  }, [dateStr])

  useEffect(() => {
    fetchAttendance()
  }, [fetchAttendance])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  if (!classData || !classData.assigned) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CalendarCheck className="h-12 w-12 text-muted-foreground mb-3" />
        <h2 className="text-lg font-semibold">No Class Assigned</h2>
        <p className="text-sm text-muted-foreground mt-1">
          You are not assigned as a class teacher. Sit back and relax, you are free from attendance duty.
        </p>
      </div>
    )
  }

  const isToday = format(new Date(), "yyyy-MM-dd") === dateStr
  const weekStart = getWeekStart()
  const weekStartStr = format(weekStart, "yyyy-MM-dd")
  const isWithinEditWindow = dateStr >= weekStartStr

  return (
    <div className="space-y-4">
      {/* Class info + date picker + tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">
            Class {classData.class}-{classData.section}
          </span>

          {classData.isSubmitted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
              <Info className="h-3 w-3" />
              {isToday ? "Submitted — editing" : "Submitted"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Tab buttons */}
          <div className="flex rounded-lg border bg-muted p-0.5">
            <button
              onClick={() => setActiveTab("mark")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === "mark"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Mark
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === "history"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              History
            </button>
          </div>

          {/* Date picker (only shown on Mark tab) */}
          {activeTab === "mark" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">{format(selectedDate, "MMM d, yyyy")}</span>
                  <span className="sm:hidden">{format(selectedDate, "MMM d")}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <AttendanceCalendar
                  selectedDate={selectedDate}
                  onDateChange={(d) => setSelectedDate(d)}
                  dayOverrides={dayOverrides}
                  displayMonth={displayMonth}
                  onMonthChange={setDisplayMonth}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Content */}
      {activeTab === "mark" ? (
        <>
          {!isWithinEditWindow && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              <Eye className="h-4 w-4 shrink-0" />
              Viewing past attendance (editing only available for the current week)
            </div>
          )}
          <AttendanceForm
            key={dateStr}
            students={classData.students ?? []}
            date={dateStr}
            isSubmitted={classData.isSubmitted ?? false}
            onSubmitSuccess={fetchAttendance}
            readOnly={!isWithinEditWindow}
          />
        </>
      ) : (
        <TeacherAttendanceHistory />
      )}
    </div>
  )
}
