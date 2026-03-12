"use client"

import { useMemo } from "react"
import Link from "next/link"
import { AgGridReact } from "ag-grid-react"
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community"
import type { ColDef } from "ag-grid-community"
import { ChevronRight } from "lucide-react"
import type { School } from "./SchoolCard"

ModuleRegistry.registerModules([AllCommunityModule])

interface SchoolsTableProps {
  schools: School[]
}

function LinkCellRenderer({ data }: { data?: School }) {
  if (!data) return null
  return (
    <Link
      href={`/super-admins/${data.schoolCode}`}
      className="flex items-center justify-center h-full text-muted-foreground hover:text-foreground"
    >
      <ChevronRight size={18} />
    </Link>
  )
}

export default function SchoolsTable({ schools }: SchoolsTableProps) {
  const colDefs = useMemo<ColDef<School>[]>(
    () => [
      {
        headerName: "#",
        width: 60,
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        sortable: false,
      },
      {
        headerName: "School Name",
        field: "schoolName",
        flex: 2,
        minWidth: 160,
      },
      {
        headerName: "School Code",
        field: "schoolCode",
        flex: 1,
        minWidth: 120,
        cellClass: "font-mono text-sm",
      },
      {
        headerName: "",
        width: 60,
        sortable: false,
        cellRenderer: LinkCellRenderer,
        cellStyle: { padding: 0 },
      },
    ],
    []
  )

  return (
    <div className="ag-theme-quartz" style={{ height: Math.min(schools.length * 46 + 50, 500) }}>
      <AgGridReact
        rowData={schools}
        columnDefs={colDefs}
        rowHeight={46}
        suppressMovableColumns
      />
    </div>
  )
}
