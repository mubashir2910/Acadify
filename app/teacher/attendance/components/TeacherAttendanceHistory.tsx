"use client"

import { useCallback, useEffect, useState, useMemo } from "react"
import { AgGridReact } from "ag-grid-react"
import { AllCommunityModule } from "ag-grid-community"
import type { ColDef, ICellRendererParams } from "ag-grid-community"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import type { ClassStudentStat } from "@/schemas/attendance.schema"

interface HistoryData {
  assigned: boolean
  class?: string
  section?: string
  sessionStartedOn?: string | null
  stats?: ClassStudentStat[]
}

export default function TeacherAttendanceHistory() {
  const [data, setData] = useState<HistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/attendance/summary")
      if (!res.ok) throw new Error("Failed to fetch")
      setData(await res.json())
    } catch {
      setError("Failed to load attendance history")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "",
        field: "profilePicture",
        width: 55,
        cellRenderer: (params: ICellRendererParams<ClassStudentStat>) => {
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
        },
        sortable: false,
        filter: false,
      },
      {
        headerName: "Roll",
        field: "rollNo",
        width: 70,
        sort: "asc",
      },
      {
        headerName: "Name",
        field: "name",
        flex: 1,
        minWidth: 140,
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
        width: 90,
        cellRenderer: (params: { value: number }) => {
          const rate = params.value
          const rateClass =
            rate >= 80
              ? "bg-green-600 text-white"
              : rate >= 60
                ? "bg-amber-500 text-white"
                : "bg-red-600 text-white"
          return <Badge className={rateClass}>{rate}%</Badge>
        },
      },
    ],
    []
  )

  if (loading) {
    return <Skeleton className="h-64 w-full rounded-xl" />
  }

  if (error) {
    return <p className="text-sm text-destructive text-center py-8">{error}</p>
  }

  if (!data || !data.assigned) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No class assigned.
      </p>
    )
  }

  if (!data.sessionStartedOn) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Session start date not configured. Contact the administrator.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          Class {data.class}-{data.section}
        </span>
        <span className="text-xs">
          Session from {new Date(data.sessionStartedOn).toLocaleDateString()}
        </span>
      </div>

      <div className="ag-theme-quartz w-full" style={{ height: 500 }}>
        <AgGridReact
          modules={[AllCommunityModule]}
          rowData={data.stats ?? []}
          columnDefs={columnDefs}
          domLayout="normal"
          pagination
          paginationPageSize={30}
          suppressCellFocus
        />
      </div>
    </div>
  )
}
