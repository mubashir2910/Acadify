"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarDays } from "lucide-react"
import { LogFilters } from "./LogFilters"
import { LogsTable } from "./LogsTable"
import { MissingLogsTable } from "./MissingLogsTable"
import { getNowIST } from "@/lib/working-days"

interface AdminClassLogEntry {
  id: string
  date: string
  class: string
  section: string
  subject: string
  periodLabel: string
  teacherName: string
  topic: string
  description: string | null
  attachmentUrl: string | null
  attachmentType: string | null
}

interface MissingLogSlot {
  timetableId: string
  class: string
  section: string
  subject: string
  periodLabel: string
  startTime: string
  endTime: string
  teacherName: string
}

interface ClassSection { class: string; section: string }

export function AdminTrackLogSection() {
  // All Logs state
  const [logs, setLogs] = useState<AdminClassLogEntry[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedSection, setSelectedSection] = useState("")
  const [from, setFrom] = useState(() => {
    const d = getNowIST(); d.setUTCDate(d.getUTCDate() - 7); return d.toISOString().split("T")[0]
  })
  const [to, setTo] = useState(() => getNowIST().toISOString().split("T")[0])

  // Missing Logs state
  const [missingSlots, setMissingSlots] = useState<MissingLogSlot[]>([])
  const [missingLoading, setMissingLoading] = useState(false)
  const [missingDate, setMissingDate] = useState(() => getNowIST().toISOString().split("T")[0])

  // Derive unique class-sections from loaded logs (used by filter)
  const classSections: ClassSection[] = Array.from(
    new Map(logs.map((l) => [`${l.class}|${l.section}`, { class: l.class, section: l.section }])).values()
  ).sort((a, b) => a.class.localeCompare(b.class) || a.section.localeCompare(b.section))

  // Fetch all logs
  useEffect(() => {
    setLogsLoading(true)
    const params = new URLSearchParams({ from, to })
    if (selectedClass) params.set("class", selectedClass)
    if (selectedSection) params.set("section", selectedSection)
    fetch(`/api/class-log?${params}`)
      .then((r) => r.json())
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .catch(() => setLogs([]))
      .finally(() => setLogsLoading(false))
  }, [selectedClass, selectedSection, from, to])

  // Fetch missing logs
  useEffect(() => {
    setMissingLoading(true)
    fetch(`/api/class-log?missing=true&date=${missingDate}`)
      .then((r) => r.json())
      .then((data) => setMissingSlots(Array.isArray(data) ? data : []))
      .catch(() => setMissingSlots([]))
      .finally(() => setMissingLoading(false))
  }, [missingDate])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Track Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor teaching coverage across the school</p>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Logs</TabsTrigger>
          <TabsTrigger value="missing">Missing Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-4">
          <LogFilters
            classSections={classSections}
            selectedClass={selectedClass}
            selectedSection={selectedSection}
            from={from}
            to={to}
            onClassChange={setSelectedClass}
            onSectionChange={setSelectedSection}
            onFromChange={setFrom}
            onToChange={setTo}
          />
          {logsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
            </div>
          ) : (
            <LogsTable logs={logs} />
          )}
        </TabsContent>

        <TabsContent value="missing" className="mt-4 space-y-4">
          <div className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-3">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <label htmlFor="m-date" className="font-medium">Date</label>
              <input
                id="m-date"
                type="date"
                value={missingDate}
                max={getNowIST().toISOString().split("T")[0]}
                onChange={(e) => setMissingDate(e.target.value)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>
          {missingLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
            </div>
          ) : (
            <MissingLogsTable slots={missingSlots} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
