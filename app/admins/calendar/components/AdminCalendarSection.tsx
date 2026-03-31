"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import DayEditModal from "./DayEditModal"
import type { CalendarDayOverride } from "@/schemas/calendar.schema"

export default function AdminCalendarSection() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [overrides, setOverrides] = useState<CalendarDayOverride[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const monthStr = format(currentMonth, "yyyy-MM")

  const fetchOverrides = useCallback(async () => {
    try {
      const res = await fetch(`/api/calendar?month=${monthStr}`)
      if (res.ok) {
        const data = await res.json()
        setOverrides(data.overrides ?? [])
      }
    } catch {
      // Silently fail
    }
  }, [monthStr])

  useEffect(() => {
    fetchOverrides()
  }, [fetchOverrides])

  // Build override map for quick lookup
  const overrideMap = new Map<string, CalendarDayOverride>()
  for (const o of overrides) {
    overrideMap.set(o.date, o)
  }

  // Compute modifier date arrays
  const holidayDates: Date[] = []
  const workingDayDates: Date[] = []
  const halfDayDates: Date[] = []
  const eventDates: Date[] = []

  for (const o of overrides) {
    const d = new Date(o.date + "T00:00:00")
    if (o.type === "HOLIDAY") holidayDates.push(d)
    else if (o.type === "WORKING_DAY") workingDayDates.push(d)
    else if (o.type === "HALF_DAY") halfDayDates.push(d)
    else if (o.type === "EVENT") eventDates.push(d)
  }

  // Default weekends → holiday; default weekdays → working
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day)
    const dayOfWeek = d.getDay()
    const ds = format(d, "yyyy-MM-dd")
    if (!overrideMap.has(ds)) {
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        holidayDates.push(d)
      } else {
        workingDayDates.push(d)
      }
    }
  }

  const handleDayClick = (date: Date | undefined) => {
    if (!date) return
    const ds = format(date, "yyyy-MM-dd")
    setSelectedDate(ds)
    setModalOpen(true)
  }

  const getDateInfo = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00")
    const dayOfWeek = d.getDay()
    const weekend = dayOfWeek === 0 || dayOfWeek === 6
    const override = overrideMap.get(dateStr)

    if (override) {
      const labels: Record<string, string> = {
        HOLIDAY: `Holiday${override.reason ? ` — ${override.reason}` : ""}`,
        WORKING_DAY: "Working Day (Override)",
        HALF_DAY: `Half Day${override.reason ? ` — ${override.reason}` : ""}`,
        EVENT: `Event${override.reason ? ` — ${override.reason}` : ""}`,
      }
      return {
        currentType: override.type as CalendarDayOverride["type"],
        isWeekend: weekend,
        isOverride: true,
        reason: override.reason,
        label: labels[override.type] ?? override.type,
      }
    }

    return {
      currentType: null as CalendarDayOverride["type"] | null,
      isWeekend: weekend,
      isOverride: false,
      reason: null,
      label: weekend ? "Holiday (Weekend)" : "Working Day",
    }
  }

  const keyDays = overrides.filter((o) => o.reason)

  return (
    <>
   

      <Card>
        <CardContent className="p-2 md:p-4">
           {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-green-50 border border-green-200" />
              <span>Working Day</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-rose-100" />
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


 
          <Calendar
            mode="single"
            showOutsideDays={false}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            onSelect={handleDayClick}
            modifiers={{
              holiday: holidayDates,
              workingDay: workingDayDates,
              halfDay: halfDayDates,
              event: eventDates,
            }}
            modifiersClassNames={{
              holiday:
                "[&_button]:bg-rose-50 [&_button]:text-rose-500",
              workingDay:
                "[&_button]:bg-green-50 [&_button]:text-green-700",
              halfDay:
                "[&_button]:bg-amber-50 [&_button]:text-amber-700 [&_button]:ring-1 [&_button]:ring-amber-200",
              event:
                "[&_button]:bg-blue-50 [&_button]:text-blue-700 [&_button]:ring-1 [&_button]:ring-blue-200",
            }}
            className={cn("w-full [--cell-size:--spacing(8)] min-[375px]:[--cell-size:--spacing(10)] md:[--cell-size:--spacing(14)]")}
          />

         

        
        </CardContent>
      </Card>

      {selectedDate && (
        <DayEditModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          dateStr={selectedDate}
          dateInfo={getDateInfo(selectedDate)}
          onSuccess={() => {
            setModalOpen(false)
            fetchOverrides()
          }}
        />
      )}

         {/* Notable days this month */}
      {keyDays.length > 0 && (
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-sm font-semibold mb-3">Notable days this month</p>
            <div className="space-y-2">
              {keyDays.map((o) => {
                const pillClass =
                  o.type === "HOLIDAY"
                    ? "border border-rose-300 text-rose-600 bg-rose-50"
                    : o.type === "HALF_DAY"
                      ? "border border-amber-300 text-amber-700 bg-amber-50"
                      : o.type === "EVENT"
                        ? "border border-blue-300 text-blue-700 bg-blue-50"
                        : "border border-green-300 text-green-700 bg-green-50"
                return (
                  <div key={o.date} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${pillClass}`}>
                    <span className="font-semibold">
                      {format(new Date(o.date + "T00:00:00"), "MMM d")}
                    </span>
                    <span className="opacity-60">·</span>
                    <span>{o.reason}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
