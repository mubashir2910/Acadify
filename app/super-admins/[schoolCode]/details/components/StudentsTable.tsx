"use client"

import { useEffect, useState, useMemo } from "react"
import { AgGridReact } from "ag-grid-react"
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community"
import type { ColDef, ValueGetterParams } from "ag-grid-community"

ModuleRegistry.registerModules([AllCommunityModule])

interface Student {
  id: string
  admission_no: string | null
  roll_no: string
  class: string
  section: string
  created_at: string
  user: {
    name: string
    username: string
    email: string | null
    phone: string | null
  }
}

interface StudentsTableProps {
  schoolCode: string
}

export default function StudentsTable({ schoolCode }: StudentsTableProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/schools/${schoolCode}/students`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.message ?? "Failed to fetch students")
        }
        return res.json() as Promise<Student[]>
      })
      .then((data) => {
        setStudents(data)
        setLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setLoading(false)
      })
  }, [schoolCode])

  const colDefs = useMemo<ColDef<Student>[]>(
    () => [
      {
        headerName: "Student Name",
        flex: 2,
        minWidth: 150,
        valueGetter: (p: ValueGetterParams<Student>) => p.data?.user.name,
      },
      {
        headerName: "Student ID",
        flex: 1,
        minWidth: 110,
        cellClass: "font-mono text-xs",
        valueGetter: (p: ValueGetterParams<Student>) => p.data?.user.username,
      },
      {
        headerName: "Admission No.",
        flex: 1,
        minWidth: 120,
        valueGetter: (p: ValueGetterParams<Student>) => p.data?.admission_no ?? "—",
      },
      {
        headerName: "Roll No.",
        field: "roll_no",
        flex: 1,
        minWidth: 90,
      },
      {
        headerName: "Class",
        flex: 1,
        minWidth: 80,
        valueGetter: (p: ValueGetterParams<Student>) =>
          `${p.data?.class} ${p.data?.section}`,
      },
      {
        headerName: "Email",
        flex: 2,
        minWidth: 150,
        valueGetter: (p: ValueGetterParams<Student>) => p.data?.user.email ?? "—",
      },
      {
        headerName: "Phone",
        flex: 1,
        minWidth: 120,
        valueGetter: (p: ValueGetterParams<Student>) => p.data?.user.phone ?? "—",
      },
      {
        headerName: "Created",
        flex: 1,
        minWidth: 110,
        valueGetter: (p: ValueGetterParams<Student>) =>
          new Date(p.data!.created_at).toLocaleDateString(),
      },
    ],
    []
  )

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading students...</p>
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  if (students.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No students imported yet for this school.
      </p>
    )
  }

  return (
    <div className="ag-theme-quartz" style={{ height: 500 }}>
      <AgGridReact
        rowData={students}
        columnDefs={colDefs}
        rowHeight={46}
        pagination
        paginationPageSize={100}
      />
    </div>
  )
}
