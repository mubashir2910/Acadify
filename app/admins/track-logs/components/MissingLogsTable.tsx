"use client"

import { useMemo } from "react"
import { AgGridReact } from "ag-grid-react"
import { AllCommunityModule } from "ag-grid-community"
import type { ColDef } from "ag-grid-community"
import { Badge } from "@/components/ui/badge"
import { AlertCircle } from "lucide-react"

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

interface MissingLogsTableProps {
  slots: MissingLogSlot[]
}

export function MissingLogsTable({ slots }: MissingLogsTableProps) {
  const columnDefs = useMemo<ColDef<MissingLogSlot>[]>(
    () => [
      {
        headerName: "Period",
        field: "periodLabel",
        width: 110,
        valueGetter: (p) => `${p.data?.periodLabel} (${p.data?.startTime}–${p.data?.endTime})`,
      },
      {
        headerName: "Class",
        width: 100,
        valueGetter: (p) => `${p.data?.class} — ${p.data?.section}`,
      },
      { headerName: "Subject", field: "subject", flex: 1, minWidth: 120 },
      { headerName: "Assigned Teacher", field: "teacherName", flex: 1, minWidth: 140 },
      {
        headerName: "Status",
        width: 120,
        cellRenderer: () => (
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Not Logged</span>
          </div>
        ),
      },
    ],
    []
  )

  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground rounded-xl border border-dashed border-border">
        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mb-2">
          <span className="text-green-600 dark:text-green-400 text-lg">✓</span>
        </div>
        <p className="font-medium text-muted-foreground">All classes are covered</p>
        <p className="text-xs mt-1">Every scheduled slot has a class log for this date</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge className="bg-amber-100 text-amber-700 dark:text-amber-400 hover:bg-amber-100">
          {slots.length} slot{slots.length !== 1 ? "s" : ""} not logged
        </Badge>
      </div>
      <div className="ag-theme-quartz w-full" style={{ height: Math.min(slots.length * 44 + 60, 400) }}>
        <AgGridReact
          modules={[AllCommunityModule]}
          rowData={slots}
          columnDefs={columnDefs}
          defaultColDef={{ resizable: true, sortable: true }}
          rowHeight={44}
        />
      </div>
    </div>
  )
}
