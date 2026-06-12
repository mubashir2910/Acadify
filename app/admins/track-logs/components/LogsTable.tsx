"use client"

import { useMemo } from "react"
import { AgGridReact } from "ag-grid-react"
import { AllCommunityModule } from "ag-grid-community"
import type { ColDef } from "ag-grid-community"
import { FileText, Image, ExternalLink } from "lucide-react"

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

interface LogsTableProps {
  logs: AdminClassLogEntry[]
}

export function LogsTable({ logs }: LogsTableProps) {
  const columnDefs = useMemo<ColDef<AdminClassLogEntry>[]>(
    () => [
      {
        headerName: "Date",
        field: "date",
        width: 120,
        valueFormatter: (p) =>
          p.value
            ? new Date(p.value + "T00:00:00").toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "—",
        sort: "desc",
      },
      { headerName: "Period", field: "periodLabel", width: 110 },
      {
        headerName: "Class",
        width: 100,
        valueGetter: (p) => `${p.data?.class} — ${p.data?.section}`,
      },
      { headerName: "Subject", field: "subject", flex: 1, minWidth: 120 },
      { headerName: "Teacher", field: "teacherName", flex: 1, minWidth: 130 },
      { headerName: "Topic", field: "topic", flex: 2, minWidth: 160 },
      {
        headerName: "Attachment",
        field: "attachmentUrl",
        width: 110,
        cellRenderer: (p: { data: AdminClassLogEntry }) => {
          if (!p.data.attachmentUrl) return <span className="text-slate-300">—</span>
          return (
            <a
              href={p.data.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-xs"
            >
              {p.data.attachmentType === "pdf" ? (
                <FileText className="h-3.5 w-3.5" />
              ) : (
                <Image className="h-3.5 w-3.5" />
              )}
              View
              <ExternalLink className="h-3 w-3" />
            </a>
          )
        },
      },
    ],
    []
  )

  return (
    <div className="ag-theme-quartz w-full" style={{ height: 500 }}>
      <AgGridReact
        modules={[AllCommunityModule]}
        rowData={logs}
        columnDefs={columnDefs}
        defaultColDef={{ resizable: true, sortable: true, filter: true }}
        pagination
        paginationPageSize={20}
        rowHeight={44}
        overlayNoRowsTemplate="<span class='text-muted-foreground text-sm'>No logs found</span>"
      />
    </div>
  )
}
