"use client"

import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { BookOpen, FileText, Image, ExternalLink } from "lucide-react"
import { getNowIST } from "@/lib/working-days"

interface ClassLogEntry {
  id: string
  date: string
  class: string
  section: string
  subject: string
  periodLabel: string
  topic: string
  description: string | null
  attachmentUrl: string | null
  attachmentType: string | null
}

interface GroupedLogs {
  date: string
  entries: ClassLogEntry[]
}

function groupByDate(logs: ClassLogEntry[]): GroupedLogs[] {
  const map = new Map<string, ClassLogEntry[]>()
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

function getTodayStr() {
  return getNowIST().toISOString().split("T")[0]
}

function getDefaultFrom() {
  const d = getNowIST()
  d.setUTCDate(d.getUTCDate() - 7)
  return d.toISOString().split("T")[0]
}

export function LogHistorySection() {
  const [logs, setLogs] = useState<ClassLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(getDefaultFrom)
  const [to, setTo] = useState(getTodayStr)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/class-log?view=history&from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [from, to])

  const grouped = groupByDate(logs)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <label htmlFor="history-from" className="font-medium">From</label>
          <input
            id="history-from"
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="history-to" className="font-medium">To</label>
          <input
            id="history-to"
            type="date"
            value={to}
            min={from}
            max={getTodayStr()}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <BookOpen className="h-10 w-10 mb-2 opacity-40" />
          <p className="text-sm">No logs found for this range</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ date, entries }) => (
            <div key={date}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {formatDate(date)}
              </p>
              <div className="space-y-2">
                {entries.map((log) => (
                  <div key={log.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{log.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          Class {log.class} — {log.section} · {log.periodLabel}
                        </p>
                        <p className="text-sm text-foreground mt-1.5">
                          <span className="font-medium">Topic:</span> {log.topic}
                        </p>
                        {log.description && (
                          <p className="text-sm text-muted-foreground mt-1">{log.description}</p>
                        )}
                      </div>
                      {log.attachmentUrl && (
                        <a
                          href={log.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                        >
                          {log.attachmentType === "pdf" ? (
                            <FileText className="h-3.5 w-3.5" />
                          ) : (
                            <Image className="h-3.5 w-3.5" />
                          )}
                          Attachment
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
