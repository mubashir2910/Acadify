"use client"

import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { BookOpen, CalendarDays } from "lucide-react"
import { SlotCard } from "./SlotCard"
import { LogFormModal } from "./LogFormModal"
import { LogHistorySection } from "./LogHistorySection"
import { getNowIST } from "@/lib/working-days"

interface SlotWithLog {
  timetableId: string
  subject: string
  class: string
  section: string
  periodLabel: string
  startTime: string
  endTime: string
  log: {
    id: string
    topic: string
    description: string | null
    attachmentUrl: string | null
    attachmentType: string | null
  } | null
}

interface DashboardMeta {
  isTeacher: boolean
  isHoliday: boolean
  loggable: boolean
}

const BACKDATE_DAYS = 3

function getTodayStr() {
  return getNowIST().toISOString().split("T")[0]
}

function getMinDate() {
  const d = getNowIST()
  d.setUTCDate(d.getUTCDate() - BACKDATE_DAYS)
  return d.toISOString().split("T")[0]
}

export function AdminClassLogSection() {
  const [date, setDate] = useState(getTodayStr())
  const [slots, setSlots] = useState<SlotWithLog[]>([])
  const [meta, setMeta] = useState<DashboardMeta>({ isTeacher: true, isHoliday: false, loggable: true })
  const [loading, setLoading] = useState(true)
  const [activeSlot, setActiveSlot] = useState<SlotWithLog | null>(null)

  const fetchSlots = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/class-log?view=dashboard&date=${date}`)
      const data = await res.json()
      if (data && Array.isArray(data.slots)) {
        setSlots(data.slots)
        setMeta({ isTeacher: !!data.isTeacher, isHoliday: !!data.isHoliday, loggable: !!data.loggable })
      } else {
        setSlots([])
        setMeta({ isTeacher: true, isHoliday: false, loggable: false })
      }
    } catch {
      setSlots([])
      setMeta({ isTeacher: true, isHoliday: false, loggable: false })
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => { fetchSlots() }, [fetchSlots])

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Class Log</h1>
        <p className="text-sm text-muted-foreground mt-1">Record what you taught and attach materials</p>
      </div>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Today&apos;s Classes</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4 space-y-4">
          {/* Date selector */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <label htmlFor="log-date" className="font-medium">Date</label>
            <input
              id="log-date"
              type="date"
              value={date}
              min={getMinDate()}
              max={getTodayStr()}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          {!loading && !meta.isTeacher ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <BookOpen className="h-12 w-12 mb-3 opacity-30" />
              <p className="font-medium">You have no teaching assignments</p>
              <p className="text-xs mt-1">Only staff with a teacher record can log classes</p>
            </div>
          ) : (
            <>
              {!loading && meta.isHoliday && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                  This day is marked as a school holiday — logging is disabled.
                </div>
              )}
              {!loading && !meta.isHoliday && !meta.loggable && (
                <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  Logging is only allowed for the last 3 days.
                </div>
              )}

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                </div>
              ) : slots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mb-3 opacity-30" />
                  <p className="font-medium">No classes scheduled for this day</p>
                  <p className="text-xs mt-1">Timetable has no slots assigned to you on this date</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {slots.map((slot) => (
                    <SlotCard
                      key={slot.timetableId}
                      {...slot}
                      date={date}
                      disabled={!meta.loggable}
                      onLog={() => setActiveSlot(slot)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <LogHistorySection />
        </TabsContent>
      </Tabs>

      {activeSlot && (
        <LogFormModal
          key={activeSlot.timetableId}
          open={true}
          onClose={() => setActiveSlot(null)}
          slot={{ ...activeSlot, date }}
          existing={activeSlot.log}
          onSaved={fetchSlots}
        />
      )}
    </div>
  )
}
