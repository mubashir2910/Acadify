"use client"

import { useEffect, useState, useMemo } from "react"
import { AgGridReact } from "ag-grid-react"
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community"
import type { ColDef, ValueGetterParams } from "ag-grid-community"

ModuleRegistry.registerModules([AllCommunityModule])

interface Teacher {
  id: string
  employee_id: string
  joining_date: string | null
  status: string
  created_at: string
  user: {
    name: string
    email: string
  }
}

interface TeachersTableProps {
  schoolCode: string
}

export default function TeachersTable({ schoolCode }: TeachersTableProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/schools/${schoolCode}/teachers`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.message ?? "Failed to fetch teachers")
        }
        return res.json() as Promise<Teacher[]>
      })
      .then((data) => {
        setTeachers(data)
        setLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setLoading(false)
      })
  }, [schoolCode])

  const colDefs = useMemo<ColDef<Teacher>[]>(
    () => [
      {
        headerName: "Name",
        flex: 2,
        minWidth: 150,
        valueGetter: (p: ValueGetterParams<Teacher>) => p.data?.user.name,
      },
      {
        headerName: "Employee ID",
        flex: 1,
        minWidth: 120,
        cellClass: "font-mono text-xs",
        field: "employee_id",
      },
      {
        headerName: "Email",
        flex: 2,
        minWidth: 150,
        valueGetter: (p: ValueGetterParams<Teacher>) => p.data?.user.email ?? "—",
      },
      {
        headerName: "Joining Date",
        flex: 1,
        minWidth: 120,
        valueGetter: (p: ValueGetterParams<Teacher>) =>
          p.data?.joining_date
            ? new Date(p.data.joining_date).toLocaleDateString()
            : "—",
      },
      {
        headerName: "Status",
        field: "status",
        flex: 1,
        minWidth: 90,
      },
      {
        headerName: "Created",
        flex: 1,
        minWidth: 110,
        valueGetter: (p: ValueGetterParams<Teacher>) =>
          new Date(p.data!.created_at).toLocaleDateString(),
      },
    ],
    []
  )

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading teachers...</p>
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  if (teachers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No teachers imported yet for this school.
      </p>
    )
  }

  return (
    <div className="ag-theme-quartz" style={{ height: 500 }}>
      <AgGridReact
        rowData={teachers}
        columnDefs={colDefs}
        rowHeight={46}
        pagination
        paginationPageSize={100}
      />
    </div>
  )
}
