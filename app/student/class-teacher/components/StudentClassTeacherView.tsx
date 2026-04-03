"use client"

import { useEffect, useState, useMemo } from "react"
import { AgGridReact } from "ag-grid-react"
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community"
import type { ColDef, ICellRendererParams } from "ag-grid-community"
import { Skeleton } from "@/components/ui/skeleton"
import { UserRound } from "lucide-react"

ModuleRegistry.registerModules([AllCommunityModule])

interface Classmate {
  name: string
  rollNo: string
  profilePicture: string | null
}

interface ClassTeacherData {
  class: string
  section: string
  teacherName: string | null
  classmates: Classmate[]
}

function ProfilePicCell(params: ICellRendererParams<Classmate>) {
  const pic = params.data?.profilePicture
  const name = params.data?.name ?? "?"

  if (pic) {
    return (
      <div className="flex items-center justify-center h-full">
        <img src={pic} alt={name} className="h-8 w-8 rounded-full object-cover" />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-medium">
        {name.charAt(0).toUpperCase()}
      </div>
    </div>
  )
}

export function StudentClassTeacherView() {
  const [data, setData] = useState<ClassTeacherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/class-teachers/my-teacher")
        if (!res.ok) throw new Error("Failed to fetch class teacher")
        setData(await res.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const colDefs = useMemo<ColDef<Classmate>[]>(
    () => [
      {
        headerName: "",
        width: 60,
        sortable: false,
        filter: false,
        cellRenderer: ProfilePicCell,
      },
      {
        headerName: "Name",
        field: "name",
        flex: 2,
        minWidth: 160,
        sort: "asc",
      },
      {
        headerName: "Roll No",
        field: "rollNo",
        flex: 1,
        minWidth: 100,
      },
    ],
    []
  )

  if (loading) return <Skeleton className="h-40 w-full rounded-xl" />
  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Class teacher card */}
      <div className="rounded-lg border bg-slate-50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
            <UserRound className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Your Class Teacher</p>
            <p className="text-lg font-semibold">
              {data.teacherName ?? "Not assigned"}
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Class {data.class} — Section {data.section}
        </p>
      </div>

      {/* Classmates table */}
      {data.classmates.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">
            Your Classmates
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({data.classmates.length} students)
            </span>
          </h2>
          <div className="ag-theme-quartz" style={{ height: Math.min(480, data.classmates.length * 48 + 56) }}>
            <AgGridReact
              rowData={data.classmates}
              columnDefs={colDefs}
              rowHeight={46}
              pagination={data.classmates.length > 30}
              paginationPageSize={30}
              suppressCellFocus
            />
          </div>
        </div>
      )}
    </div>
  )
}
