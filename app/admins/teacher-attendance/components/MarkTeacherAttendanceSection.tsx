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
  const [calendarOpen, setCalendarOpen] = useState(false)
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
      <div className="flex-1 space-y-4 min-w-0">
        {/* Mobile: date button */}
        <div className="flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-2">
            {isSubmitted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                <Info className="h-3 w-3" />
                {isToday ? "Submitted — editing" : "Submitted"}
              </span>
            )}
          </div>
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

        {/* Desktop: submitted badge */}
        <div className="hidden lg:flex items-center gap-2">
          {isSubmitted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
              <Info className="h-3 w-3" />
              {isToday ? "Submitted — editing" : "Submitted"}
            </span>
          )}
        </div>

        {/* View-only banner */}
        {!isWithinEditWindow && (
          <div className={cn(
            "flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700"
          )}>
            <Eye className="h-4 w-4 shrink-0" />
            Viewing past attendance (editing only available for the current week)
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

      {/* Desktop calendar sidebar */}
      <div className="hidden lg:block lg:w-auto shrink-0">
        <div className="sticky top-4 rounded-xl border bg-card p-3">
          {calendarSidebar}
          <p className="text-xs text-muted-foreground text-center mt-2">
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </p>
        </div>
      </div>
    </div>
  )
}
