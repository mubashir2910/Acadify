"use client"

import { Calendar } from "@/components/ui/calendar"
import { isWeekend } from "@/lib/working-days"
import type { DayType } from "@/schemas/calendar.schema"

interface AttendanceCalendarProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  className?: string
  /** Map of date string (YYYY-MM-DD) → DayType overrides */
  dayOverrides?: Map<string, DayType>
  /** Controlled displayed month — pass when you need to sync month changes externally */
  displayMonth?: Date
  /** Called when the user navigates to a different month */
  onMonthChange?: (month: Date) => void
}

export function AttendanceCalendar({
  selectedDate,
  onDateChange,
  className,
  dayOverrides,
  displayMonth,
  onMonthChange,
}: AttendanceCalendarProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <Calendar
      mode="single"
      selected={selectedDate}
      onSelect={(date) => date && onDateChange(date)}
      month={displayMonth}
      onMonthChange={onMonthChange}
      disabled={(date) => {
        const d = new Date(date)
        d.setHours(0, 0, 0, 0)
        if (d > today) return true

        // Use local-time parts to match how the API returns dates ("YYYY-MM-DD" in IST).
        // toISOString() would shift IST midnight back to UTC, producing the previous day's string.
        const ds = [
          d.getFullYear(),
          String(d.getMonth() + 1).padStart(2, "0"),
          String(d.getDate()).padStart(2, "0"),
        ].join("-")
        const override = dayOverrides?.get(ds)

        // WORKING_DAY, HALF_DAY, EVENT → enable (attendance allowed)
        if (override === "WORKING_DAY" || override === "HALF_DAY" || override === "EVENT") return false
        // HOLIDAY → disable
        if (override === "HOLIDAY") return true
        // Default: disable weekends
        return isWeekend(d)
      }}
      className={className}
    />
  )
}
