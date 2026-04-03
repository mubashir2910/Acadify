"use client"

import { useMemo } from "react"
import { AgGridReact } from "ag-grid-react"
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community"
import type { ColDef, ValueFormatterParams } from "ag-grid-community"

ModuleRegistry.registerModules([AllCommunityModule])

export interface EnrollmentRow {
  type: "Student" | "Teacher"
  id: string
  name: string
  class?: string
  section?: string
  roll_no?: string
  temporaryPassword: string
}

interface RecentEnrollmentsTableProps {
  rows: EnrollmentRow[]
}

export default function RecentEnrollmentsTable({ rows }: RecentEnrollmentsTableProps) {
  const colDefs = useMemo<ColDef<EnrollmentRow>[]>(
    () => [
      { headerName: "Type",          field: "type",              flex: 0.7, minWidth: 80 },
      {
        headerName: "ID",
        field: "id",
        flex: 1.2,
        minWidth: 120,
        cellStyle: { fontFamily: "monospace", fontSize: "12px" },
      },
      { headerName: "Name",          field: "name",              flex: 1.5, minWidth: 140 },
      {
        headerName: "Class",
        field: "class",
        flex: 0.6,
        minWidth: 70,
        valueFormatter: (p: ValueFormatterParams) => p.value ?? "—",
      },
      {
        headerName: "Section",
        field: "section",
        flex: 0.6,
        minWidth: 70,
        valueFormatter: (p: ValueFormatterParams) => p.value ?? "—",
      },
      {
        headerName: "Roll No",
        field: "roll_no",
        flex: 0.7,
        minWidth: 80,
        valueFormatter: (p: ValueFormatterParams) => p.value ?? "—",
      },
      {
        headerName: "Temp. Password",
        field: "temporaryPassword",
        flex: 1.2,
        minWidth: 130,
        cellStyle: { fontFamily: "monospace", fontSize: "12px" },
      },
    ],
    []
  )

  if (rows.length === 0) return null

  const gridHeight = Math.min(rows.length * 44 + 48, 420)

  return (
    <div className="ag-theme-quartz rounded-lg overflow-hidden border" style={{ height: gridHeight }}>
      <AgGridReact
        rowData={rows}
        columnDefs={colDefs}
        rowHeight={44}
        suppressMovableColumns
        suppressCellFocus
      />
    </div>
  )
}
