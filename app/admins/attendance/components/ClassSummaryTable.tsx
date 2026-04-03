"use client"

import { useMemo } from "react"
import { AgGridReact } from "ag-grid-react"
import { AllCommunityModule } from "ag-grid-community"
import type { ColDef } from "ag-grid-community"
import { Badge } from "@/components/ui/badge"
import type { ClassAttendanceSummary } from "@/schemas/attendance.schema"

interface ClassSummaryTableProps {
  classes: ClassAttendanceSummary[]
  onClassClick: (cls: string, section: string) => void
}

export default function ClassSummaryTable({
  classes,
  onClassClick,
}: ClassSummaryTableProps) {
  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "Class",
        field: "className",
        flex: 1,
        minWidth: 100,
        cellRenderer: (params: { data: ClassAttendanceSummary }) => (
          <button
            onClick={() => onClassClick(params.data.class, params.data.section)}
            className="text-blue-600 hover:underline font-medium"
          >
            {params.data.className}
          </button>
        ),
      },
      {
        headerName: "Class Teacher",
        field: "classTeacher",
        flex: 1,
        minWidth: 130,
        valueFormatter: (params: { value: string | null }) =>
          params.value ?? "—",
      },
      {
        headerName: "Present",
        field: "totalPresent",
        width: 90,
        cellRenderer: (params: { value: number }) => (
          <span className="text-green-700 font-medium">{params.value}</span>
        ),
      },
      {
        headerName: "Absent",
        field: "totalAbsent",
        width: 90,
        cellRenderer: (params: { value: number }) => (
          <span className="text-red-600 font-medium">{params.value}</span>
        ),
      },
      {
        headerName: "Late",
        field: "totalLate",
        width: 70,
        cellRenderer: (params: { value: number }) => (
          <span className="text-amber-600 font-medium">{params.value}</span>
        ),
      },
      {
        headerName: "Rate",
        field: "attendanceRate",
        width: 95,
        cellRenderer: (params: { value: number }) => {
          const rate = params.value
          const variant =
            rate >= 85 ? "default" : rate >= 70 ? "secondary" : "destructive"
          return <Badge variant={variant}>{rate}%</Badge>
        },
      },
    ],
    [onClassClick]
  )

  if (classes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No attendance data for this date.
      </p>
    )
  }

  return (
    <div className="ag-theme-quartz w-full" style={{ height: 450 }}>
      <AgGridReact
        modules={[AllCommunityModule]}
        rowData={classes}
        columnDefs={columnDefs}
        domLayout="normal"
        pagination
        paginationPageSize={20}
        suppressCellFocus
      />
    </div>
  )
}
