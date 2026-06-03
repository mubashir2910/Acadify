"use client"

import { useEffect, useState } from "react"
import { AgGridReact } from "ag-grid-react"
import { AllCommunityModule } from "ag-grid-community"
import type { ColDef } from "ag-grid-community"
import { Swords } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Quiz {
  id: string
  title: string
  subject: string
  class: string
  section: string
  start_time: string
  end_time: string
  effectiveStatus: string
  creator: { name: string }
}

type StatusFilter = "UPCOMING" | "LIVE" | "ENDED"

const STATUS_LABELS: Record<StatusFilter, string> = {
  UPCOMING: "Upcoming",
  LIVE: "Live",
  ENDED: "Ended",
}

const STATUS_CELL_STYLES: Record<string, string> = {
  UPCOMING: "bg-blue-100 text-blue-700 dark:text-blue-400 border border-blue-200",
  LIVE: "bg-green-100 text-green-700 dark:text-green-400 border border-green-200 animate-pulse",
  ENDED: "bg-muted text-muted-foreground",
}

const colDefs: ColDef<Quiz>[] = [
  { headerName: "Contest Name", field: "title", flex: 2, minWidth: 160 },
  { headerName: "Subject", field: "subject", width: 120 },
  {
    headerName: "Class / Section",
    flex: 1,
    minWidth: 120,
    valueGetter: ({ data }) => data ? `Class ${data.class} — ${data.section}` : "",
  },
  {
    headerName: "Created By",
    flex: 1,
    minWidth: 120,
    valueGetter: ({ data }) => data?.creator?.name ?? "—",
  },
  {
    headerName: "Start Time",
    field: "start_time",
    flex: 1,
    minWidth: 150,
    valueFormatter: ({ value }) =>
      value
        ? new Date(value).toLocaleString("en-IN", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })
        : "—",
  },
  {
    headerName: "End Time",
    field: "end_time",
    flex: 1,
    minWidth: 150,
    valueFormatter: ({ value }) =>
      value
        ? new Date(value).toLocaleString("en-IN", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })
        : "—",
  },
  {
    headerName: "Status",
    field: "effectiveStatus",
    width: 110,
    cellRenderer: ({ value }: { value: string }) => (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CELL_STYLES[value] ?? STATUS_CELL_STYLES.ENDED}`}>
        {value}
      </span>
    ),
  },
]

export function UpcomingContestsSection() {
  const [allQuizzes, setAllQuizzes] = useState<Quiz[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("UPCOMING")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/quiz")
      .then((r) => r.json())
      .then((data: Quiz[]) => setAllQuizzes(data))
      .catch(() => setAllQuizzes([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = allQuizzes.filter((q) => q.effectiveStatus === statusFilter)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Swords className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Contests</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} contest{filtered.length !== 1 ? "s" : ""} · {STATUS_LABELS[statusFilter]}</p>
          </div>
        </div>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UPCOMING">Upcoming</SelectItem>
            <SelectItem value="LIVE">Live</SelectItem>
            <SelectItem value="ENDED">Ended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-2xl">
          <Swords className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No {STATUS_LABELS[statusFilter].toLowerCase()} contests.</p>
        </div>
      ) : (
        <div className="ag-theme-quartz w-full" style={{ height: Math.min(filtered.length * 50 + 60, 500) }}>
          <AgGridReact
            modules={[AllCommunityModule]}
            rowData={filtered}
            columnDefs={colDefs}
            domLayout="normal"
            suppressCellFocus
          />
        </div>
      )}
    </div>
  )
}
