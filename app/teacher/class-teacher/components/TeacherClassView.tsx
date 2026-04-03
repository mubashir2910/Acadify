"use client"

import { useEffect, useState, useMemo } from "react"
import { AgGridReact } from "ag-grid-react"
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community"
import type { ColDef } from "ag-grid-community"
import { Skeleton } from "@/components/ui/skeleton"
import { ProfilePicCell } from "@/components/ui/profile-pic-cell"
import { GraduationCap } from "lucide-react"

ModuleRegistry.registerModules([AllCommunityModule])

interface StudentRow {
  roll_no: string
  house_name: string | null
  user: {
    username: string
    name: string
    profile_picture: string | null
  }
}

interface ClassData {
  assigned: true
  class: string
  section: string
  students: StudentRow[]
}

interface NotAssigned {
  assigned: false
}

type MyClassResponse = ClassData | NotAssigned

export function TeacherClassView() {
  const [data, setData] = useState<MyClassResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetch_data() {
      try {
        const res = await fetch("/api/class-teachers/my-class")
        if (!res.ok) throw new Error("Failed to fetch class data")
        setData(await res.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch")
      } finally {
        setLoading(false)
      }
    }
    fetch_data()
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
        headerName: "Roll No",
        field: "roll_no",
        flex: 1,
        minWidth: 100,
      },
      {
        headerName: "House Name",
        flex: 1,
        minWidth: 120,
        valueGetter: (p) => p.data?.house_name || "—",
      },
    ],
    []
  )

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />
  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!data) return null

  if (!data.assigned) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <GraduationCap className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          You are not assigned as a class teacher yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Assigned class info */}
      <div className="rounded-lg border bg-slate-50 p-4">
        <p className="text-sm text-muted-foreground mb-1">Assigned Class</p>
        <p className="text-lg font-semibold">
          Class {data.class} — Section {data.section}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {data.students.length} student{data.students.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Students table */}
      {data.students.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No students in this class yet.
          </p>
        </div>
      ) : (
        <div className="ag-theme-quartz " style={{ height: 500 }}>
          <AgGridReact
            rowData={data.students}
            columnDefs={colDefs}
            rowHeight={46}
            pagination
            paginationPageSize={50}
          />
        </div>
      )}
    </div>
  )
}
