"use client"

import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { BookOpen, CalendarDays } from "lucide-react"
import { ClassLogCard } from "./ClassLogCard"
import { getNowIST } from "@/lib/working-days"

interface StudentClassLogEntry {
  id: string
  date: string
  subject: string
  periodLabel: string
  teacherName: string
  topic: string
  description: string | null
  attachmentUrl: string | null
  attachmentType: string | null
}

interface GroupedLogs {
  date: string
  entries: StudentClassLogEntry[]
}

function groupByDate(logs: StudentClassLogEntry[]): GroupedLogs[] {
  const map = new Map<string, StudentClassLogEntry[]>()
  for (const log of logs) {
    const existing = map.get(log.date) ?? []
    existing.push(log)
    map.set(log.date, existing)
  }
  return Array.from(map.entries()).map(([date, entries]) => ({ date, entries }))
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function StudentClassLogSection() {
  const [logs, setLogs] = useState<StudentClassLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(() => getNowIST().toISOString().split("T")[0])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/class-log?from=${date}&to=${date}`)
      .then((r) => r.json())
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [date])

  const grouped = groupByDate(logs)

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Class Log</h1>
        <p className="text-sm text-muted-foreground mt-1">What was taught in your class</p>
      </div>

      {/* Date filter */}
      <div className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-3">
        <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <label htmlFor="s-date" className="font-medium">Date</label>
          <input
            id="s-date"
            type="date"
            value={date}
            max={getNowIST().toISOString().split("T")[0]}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <BookOpen className="h-12 w-12 mb-3 opacity-30" />
          <p className="font-medium">No class logs found for this date</p>
          <p className="text-xs mt-1">Your teachers haven&apos;t logged any classes on this date</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ date, entries }) => (
            <div key={date}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {formatDate(date)}
              </p>
              <div className="space-y-2.5">
                {entries.map((log) => (
                  <ClassLogCard key={log.id} {...log} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
