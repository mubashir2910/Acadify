"use client"

import { useCallback, useEffect, useState, useMemo } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { AttendanceCalendar } from "@/components/attendance-calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CalendarIcon } from "lucide-react"
import { getMostRecentWorkingDay } from "@/lib/working-days"
import AttendanceSummaryCards from "./AttendanceSummaryCards"
import ClassFilter from "./ClassFilter"
import ClassSummaryTable from "./ClassSummaryTable"
import ClassStudentTable from "./ClassStudentTable"
import type {
  AttendanceSummaryStats,
  ClassAttendanceSummary,
  StudentAttendanceRecord,
} from "@/schemas/attendance.schema"
import type { CalendarDayOverride, DayType } from "@/schemas/calendar.schema"

interface SchoolData {
  date: string
  summary: AttendanceSummaryStats
  classes: ClassAttendanceSummary[]
  classSections: { class: string; section: string }[]
}

interface ClassDetailData {
  date: string
  class: string
  section: string
  summary: AttendanceSummaryStats
  students: StudentAttendanceRecord[]
}

export default function AdminAttendanceSection() {
  const [selectedDate, setSelectedDate] = useState<Date>(() => getMostRecentWorkingDay())
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [displayMonth, setDisplayMonth] = useState<Date>(() => getMostRecentWorkingDay())
  const [selectedClass, setSelectedClass] = useState("all")
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null)
  const [classDetail, setClassDetail] = useState<ClassDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [calendarOverrides, setCalendarOverrides] = useState<CalendarDayOverride[]>([])

  const dateStr = format(selectedDate, "yyyy-MM-dd")
  const calendarMonth = format(displayMonth, "yyyy-MM")

  // Fetch calendar overrides for the selected month
  const fetchCalendarOverrides = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/calendar?month=${calendarMonth}`, signal ? { signal } : undefined)
      if (res.ok) {
        const data = await res.json()
        setCalendarOverrides(data.overrides ?? [])
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
      toast.error("Failed to load calendar data")
    }
  }, [calendarMonth])

  useEffect(() => {
    const controller = new AbortController()
    fetchCalendarOverrides(controller.signal)
    return () => controller.abort()
  }, [fetchCalendarOverrides])

  // Build dayOverrides map for the calendar
  const dayOverrides = useMemo(() => {
    const map = new Map<string, DayType>()
    for (const o of calendarOverrides) {
      map.set(o.date, o.type)
    }
    return map
  }, [calendarOverrides])

  // Fetch school-wide summary
  const fetchSchoolData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/attendance?date=${dateStr}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setSchoolData(data)
    } catch {
      setError("Failed to load attendance data")
    } finally {
      setLoading(false)
    }
  }, [dateStr])

  // Fetch class detail when a specific class is selected
  const fetchClassDetail = useCallback(
    async (cls: string, sec: string) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/attendance?date=${dateStr}&class=${encodeURIComponent(cls)}&section=${encodeURIComponent(sec)}`
        )
        if (!res.ok) throw new Error("Failed to fetch")
        const data = await res.json()
        setClassDetail(data)
      } catch {
        setError("Failed to load class attendance")
      } finally {
        setLoading(false)
      }
    },
    [dateStr]
  )

  useEffect(() => {
    if (selectedClass === "all") {
      setClassDetail(null)
      fetchSchoolData()
    } else {
      const [cls, sec] = selectedClass.split("|")
      fetchClassDetail(cls, sec)
    }
  }, [selectedClass, fetchSchoolData, fetchClassDetail])

  // When date changes, reset to all classes view
  useEffect(() => {
    setSelectedClass("all")
  }, [dateStr])

  const summary = selectedClass === "all" ? schoolData?.summary : classDetail?.summary
  const classSections = schoolData?.classSections ?? []

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main content */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* Summary cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : summary ? (
          <AttendanceSummaryCards summary={summary} />
        ) : null}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Class filter — mobile: dropdown + calendar button; desktop: pills only */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex-1">
            <ClassFilter
              classSections={classSections}
              selected={selectedClass}
              onChange={setSelectedClass}
            />
          </div>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0">
                <CalendarIcon className="h-4 w-4" />
                {format(selectedDate, "MMM d")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="end">
              <AttendanceCalendar
                selectedDate={selectedDate}
                onDateChange={(date) => { setSelectedDate(date); setCalendarOpen(false) }}
                dayOverrides={dayOverrides}
                displayMonth={displayMonth}
                onMonthChange={setDisplayMonth}
              />
              <p className="text-xs text-muted-foreground text-center mt-2">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </p>
            </PopoverContent>
          </Popover>
        </div>

        {/* Desktop: pills only */}
        <div className="hidden lg:block">
          <ClassFilter
            classSections={classSections}
            selected={selectedClass}
            onChange={setSelectedClass}
          />
        </div>

        {/* Table */}
        {loading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : selectedClass === "all" && schoolData ? (
          <ClassSummaryTable
            classes={schoolData.classes}
            onClassClick={(cls, sec) => setSelectedClass(`${cls}|${sec}`)}
          />
        ) : classDetail ? (
          <ClassStudentTable
            students={classDetail.students}
            date={dateStr}
            onRefresh={() => {
              const [cls, sec] = selectedClass.split("|")
              fetchClassDetail(cls, sec)
            }}
          />
        ) : null}
      </div>

      {/* Calendar sidebar — desktop only */}
      <div className="hidden lg:block lg:w-auto shrink-0">
        <Card className="sticky top-4">
          <CardContent className="p-3">
            <AttendanceCalendar
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              dayOverrides={dayOverrides}
              displayMonth={displayMonth}
              onMonthChange={setDisplayMonth}
            />
            <p className="text-xs text-muted-foreground text-center mt-2">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
