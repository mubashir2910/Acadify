"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { CalendarDayOverride } from "@/schemas/calendar.schema"

interface DayRecord {
  date: string
  status: string
}

export default function AttendanceCalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [records, setRecords] = useState<DayRecord[]>([])
  const [overrides, setOverrides] = useState<CalendarDayOverride[]>([])
  const [selectedDayStatus, setSelectedDayStatus] = useState<string | null>(null)
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null)

  const monthStr = format(currentMonth, "yyyy-MM")

  const fetchMonthData = useCallback(async () => {
    try {
      const [attendanceRes, calendarRes] = await Promise.all([
        fetch(`/api/attendance/student-monthly?month=${monthStr}`),
        fetch(`/api/calendar?month=${monthStr}`),
      ])
      if (attendanceRes.ok) {
        const data = await attendanceRes.json()
        setRecords(data.records ?? [])
      }
      if (calendarRes.ok) {
        const data = await calendarRes.json()
        setOverrides(data.overrides ?? [])
      }
    } catch {
      // Silently fail
    }
  }, [monthStr])

  useEffect(() => {
    fetchMonthData()
  }, [fetchMonthData])

  // Build maps
  const statusMap = new Map<string, string>()
  for (const r of records) {
    statusMap.set(r.date, r.status)
  }

  const overrideMap = new Map<string, CalendarDayOverride>()
  for (const o of overrides) {
    overrideMap.set(o.date, o)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get day info for a date
  const getDayInfo = (dateStr: string) => {
    const override = overrideMap.get(dateStr)
    if (override) {
      return { type: override.type, reason: override.reason }
    }
    const d = new Date(dateStr + "T00:00:00")
    const day = d.getDay()
    const weekend = day === 0 || day === 6
    return { type: weekend ? "HOLIDAY" as const : null, reason: null }
  }

  const handleDayClick = (date: Date | undefined) => {
    if (!date) return
    const ds = format(date, "yyyy-MM-dd")
    const status = statusMap.get(ds) ?? null
    setSelectedDayStatus(status)
    setSelectedDayDate(ds)
  }

  // Attendance status modifiers (base colors)
  const presentDays = records
    .filter((r) => r.status === "PRESENT")
    .map((r) => new Date(r.date + "T00:00:00"))
  const absentDays = records
    .filter((r) => r.status === "ABSENT")
    .map((r) => new Date(r.date + "T00:00:00"))
  const lateDays = records
    .filter((r) => r.status === "LATE")
    .map((r) => new Date(r.date + "T00:00:00"))

  // Combined modifiers: attendance taken on a special day — adds a ring outline to the base color
  const presentHalfDayDates: Date[] = []
  const presentEventDates: Date[] = []
  const absentHalfDayDates: Date[] = []
  const absentEventDates: Date[] = []
  const lateHalfDayDates: Date[] = []
  const lateEventDates: Date[] = []

  for (const o of overrides) {
    if (o.type !== "HALF_DAY" && o.type !== "EVENT") continue
    const status = statusMap.get(o.date)
    if (!status) continue
    const d = new Date(o.date + "T00:00:00")
    if (o.type === "HALF_DAY") {
      if (status === "PRESENT") presentHalfDayDates.push(d)
      else if (status === "ABSENT") absentHalfDayDates.push(d)
      else if (status === "LATE") lateHalfDayDates.push(d)
    } else {
      if (status === "PRESENT") presentEventDates.push(d)
      else if (status === "ABSENT") absentEventDates.push(d)
      else if (status === "LATE") lateEventDates.push(d)
    }
  }

  // Compute special day dates for the month (only for days WITHOUT attendance)
  const holidayDates: Date[] = []
  const halfDayDates: Date[] = []
  const eventDates: Date[] = []

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Add override-based modifiers (only when no attendance record)
  for (const o of overrides) {
    const d = new Date(o.date + "T00:00:00")
    if (!statusMap.has(o.date)) {
      if (o.type === "HALF_DAY") halfDayDates.push(d)
      else if (o.type === "EVENT") eventDates.push(d)
    }
  }

  // Add holidays (weekends without attendance + HOLIDAY overrides)
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day)
    const ds = format(d, "yyyy-MM-dd")
    if (statusMap.has(ds)) continue

    const override = overrideMap.get(ds)
    if (override) {
      if (override.type === "HOLIDAY") holidayDates.push(d)
      continue
    }

    const dayOfWeek = d.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      holidayDates.push(d)
    }
  }

  // Render selected day info
  const renderSelectedDayInfo = () => {
    if (!selectedDayDate) return null

    const dayInfo = getDayInfo(selectedDayDate)
    const isSpecialDay = dayInfo.type === "HALF_DAY" || dayInfo.type === "EVENT"

    if (selectedDayStatus) {
      return (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge
            className={
              selectedDayStatus === "PRESENT"
                ? "bg-green-600 text-white"
                : selectedDayStatus === "LATE"
                  ? "bg-amber-500 text-white"
                  : undefined
            }
            variant={selectedDayStatus === "ABSENT" ? "destructive" : "default"}
          >
            {selectedDayStatus === "PRESENT"
              ? "Present"
              : selectedDayStatus === "ABSENT"
                ? "Absent"
                : "Late"}
          </Badge>
          {/* Show day type + reason alongside attendance when it's a special day */}
          {isSpecialDay && (
            <>
              <Badge
                className={
                  dayInfo.type === "HALF_DAY"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-blue-100 text-blue-700"
                }
              >
                {dayInfo.type === "HALF_DAY" ? "Half Day" : "Event"}
              </Badge>
              {dayInfo.reason && (
                <span className="text-muted-foreground">— {dayInfo.reason}</span>
              )}
            </>
          )}
        </div>
      )
    }

    if (dayInfo.type === "HOLIDAY") {
      return (
        <>
          <Badge className="bg-slate-200 text-slate-600">Holiday</Badge>
          {dayInfo.reason && (
            <span className="text-muted-foreground">— {dayInfo.reason}</span>
          )}
        </>
      )
    }

    if (dayInfo.type === "HALF_DAY") {
      return (
        <>
          <Badge className="bg-amber-100 text-amber-700">Half Day</Badge>
          {dayInfo.reason && (
            <span className="text-muted-foreground">— {dayInfo.reason}</span>
          )}
        </>
      )
    }

    if (dayInfo.type === "EVENT") {
      return (
        <>
          <Badge className="bg-blue-100 text-blue-700">Event</Badge>
          {dayInfo.reason && (
            <span className="text-muted-foreground">— {dayInfo.reason}</span>
          )}
        </>
      )
    }

    return <span className="text-muted-foreground">No record</span>
  }

  return (
    <Card>
      <CardContent className="p-4">
        <Calendar
          mode="single"
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          onSelect={handleDayClick}
          disabled={(date) => {
            const d = new Date(date)
            d.setHours(0, 0, 0, 0)
            return d > today
          }}
          modifiers={{
            present: presentDays,
            absent: absentDays,
            late: lateDays,
            holiday: holidayDates,
            halfDay: halfDayDates,
            event: eventDates,
            // Combined: attendance taken on a special day
            presentHalfDay: presentHalfDayDates,
            presentEvent: presentEventDates,
            absentHalfDay: absentHalfDayDates,
            absentEvent: absentEventDates,
            lateHalfDay: lateHalfDayDates,
            lateEvent: lateEventDates,
          }}
          modifiersClassNames={{
            present:
              "[&_button]:bg-green-100 [&_button]:text-green-800 [&_button]:hover:bg-green-200",
            absent:
              "[&_button]:bg-red-100 [&_button]:text-red-800 [&_button]:hover:bg-red-200",
            late:
              "[&_button]:bg-amber-100 [&_button]:text-amber-800 [&_button]:hover:bg-amber-200",
            holiday:
              "[&_button]:bg-slate-100 [&_button]:text-slate-400",
            halfDay:
              "[&_button]:bg-amber-50 [&_button]:text-amber-700 [&_button]:ring-1 [&_button]:ring-amber-200",
            event:
              "[&_button]:bg-blue-50 [&_button]:text-blue-700 [&_button]:ring-1 [&_button]:ring-blue-200",
            // Combined modifiers: add a colored ring outline on top of the base attendance color
            presentHalfDay: "[&_button]:ring-2 [&_button]:ring-amber-400",
            presentEvent:   "[&_button]:ring-2 [&_button]:ring-blue-400",
            absentHalfDay:  "[&_button]:ring-2 [&_button]:ring-amber-400",
            absentEvent:    "[&_button]:ring-2 [&_button]:ring-blue-400",
            lateHalfDay:    "[&_button]:ring-2 [&_button]:ring-amber-600",
            lateEvent:      "[&_button]:ring-2 [&_button]:ring-blue-400",
          }}
          className={cn("w-full [--cell-size:--spacing(10)] md:[--cell-size:--spacing(11)]")}
        />

        {/* Selected day info */}
        {selectedDayDate && (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm">
            <span className="text-muted-foreground">
              {format(new Date(selectedDayDate + "T00:00:00"), "MMMM d, yyyy")}:
            </span>
            {renderSelectedDayInfo()}
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-green-200" />
            <span>Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-200" />
            <span>Absent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-amber-200" />
            <span>Late</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-slate-200" />
            <span>Holiday</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-amber-100 ring-1 ring-amber-300" />
            <span>Half Day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-blue-100 ring-1 ring-blue-300" />
            <span>Event</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
