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
        headerName: "Status",
        field: "subscription_status",
        flex: 1,
        minWidth: 110,
        cellRenderer: ({ value }: { value?: string }) => {
          if (!value) return null
          const styles: Record<string, string> = {
            TRIAL: "bg-yellow-100 text-yellow-800",
            ACTIVE: "bg-green-100 text-green-800",
            SUSPENDED: "bg-red-100 text-red-800",
            CANCELLED: "bg-gray-100 text-gray-600",
          }
          const style = styles[value] ?? "bg-gray-100 text-gray-600"
          return (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${style}`}>
              {value}
            </span>
          )
        },
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
