"use client"

import { useCallback, useEffect, useState, useMemo } from "react"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { AttendanceCalendar } from "@/components/attendance-calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CalendarIcon, Eye, Info } from "lucide-react"
import { getMostRecentWorkingDay, getWeekStart } from "@/lib/working-days"
import { cn } from "@/lib/utils"
import TeacherAttendanceForm from "./TeacherAttendanceForm"
import type { TeacherAttendanceRecord } from "@/schemas/teacher-attendance.schema"
import type { CalendarDayOverride, DayType } from "@/schemas/calendar.schema"

export default function MarkTeacherAttendanceSection() {
  const [selectedDate, setSelectedDate] = useState<Date>(() => getMostRecentWorkingDay())
  const [displayMonth, setDisplayMonth] = useState<Date>(() => getMostRecentWorkingDay())
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

  const fetchTeachers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/teacher-attendance?date=${dateStr}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setTeachers(data.teachers ?? [])
    } catch {
      setError("Failed to load teacher data")
    } finally {
      setLoading(false)
    }
  }, [dateStr])

  useEffect(() => { fetchTeachers() }, [fetchTeachers])

  const isToday = format(new Date(), "yyyy-MM-dd") === dateStr
  const weekStart = getWeekStart()
  const weekStartStr = format(weekStart, "yyyy-MM-dd")
  const isWithinEditWindow = dateStr >= weekStartStr

  const isSubmitted = teachers.some((t) => t.status !== null)

  return (
    <div className="space-y-4">
      {/* Header: submitted badge (left) + compact date picker (right) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {isSubmitted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400">
              <Info className="h-3 w-3" />
              {isToday ? "Submitted — editing" : "Submitted"}
            </span>
          )}
        </div>

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
              onDateChange={setSelectedDate}
              dayOverrides={dayOverrides}
              displayMonth={displayMonth}
              onMonthChange={setDisplayMonth}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* View-only banner for past weeks */}
      {!isWithinEditWindow && (
        <div className={cn(
          "flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:text-blue-400"
        )}>
          <Eye className="h-4 w-4 shrink-0" />
          Viewing past attendance (editing for past weeks available through Staff Insights page)
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <TeacherAttendanceForm
          teachers={teachers}
          date={dateStr}
          isSubmitted={isSubmitted}
          onSubmitSuccess={fetchTeachers}
          readOnly={!isWithinEditWindow}
        />
      )}
    </div>
  )
}
