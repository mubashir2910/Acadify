"use client"

import { useEffect, useState, useMemo } from "react"
import { AgGridReact } from "ag-grid-react"
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community"
import type { ColDef } from "ag-grid-community"
import { Skeleton } from "@/components/ui/skeleton"
import { ProfilePicCell } from "@/components/ui/profile-pic-cell"

ModuleRegistry.registerModules([AllCommunityModule])

interface StudentRow {
  roll_no: string
  class: string
  section: string
  user: {
    username: string
    name: string
    phone: string | null
    profile_picture: string | null
  }
}

export function AdminStudentsSection() {
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStudents() {
      try {
        const res = await fetch("/api/students")
        if (!res.ok) throw new Error("Failed to fetch students")
        setStudents(await res.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch")
      } finally {
        setLoading(false)
      }
    }
    fetchStudents()
  }, [])

  const colDefs = useMemo<ColDef<StudentRow>[]>(
    () => [
      {
        headerName: "",
        width: 60,
        sortable: false,
        filter: false,
        cellRenderer: ProfilePicCell,
      },
      {
        headerName: "Student ID",
        flex: 1,
        minWidth: 130,
        cellClass: "font-mono text-xs",
        valueGetter: (p) => p.data?.user.username,
      },
      {
        headerName: "Name",
        flex: 2,
        minWidth: 160,
        valueGetter: (p) => p.data?.user.name,
      },
      {
        headerName: "Phone",
        flex: 1,
        minWidth: 120,
        valueGetter: (p) => p.data?.user.phone || "—",
      },
      {
        headerName: "Class",
        field: "class",
        flex: 1,
        minWidth: 80,
      },
      {
        headerName: "Section",
        field: "section",
        flex: 1,
        minWidth: 80,
      },
      {
        headerName: "Roll No",
        field: "roll_no",
        flex: 1,
        minWidth: 90,
      },
    ],
    []
  )

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />
  if (error) return <p className="text-sm text-destructive">{error}</p>

  if (students.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">No students found.</p>
      </div>
    )
  }

  return (
    <div className="ag-theme-quartz" style={{ height: 600 }}>
      <AgGridReact
        rowData={students}
        columnDefs={colDefs}
        rowHeight={46}
        pagination
        paginationPageSize={50}
      />
    </div>
  )
}
