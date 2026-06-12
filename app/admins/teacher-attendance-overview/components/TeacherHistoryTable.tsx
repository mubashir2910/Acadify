"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AgGridReact } from "ag-grid-react"
import { AllCommunityModule } from "ag-grid-community"
import type { ColDef, ICellRendererParams } from "ag-grid-community"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import type { TeacherSchoolStat } from "@/schemas/teacher-attendance.schema"

interface HistoryResponse {
  sessionStartedOn: string | null
  stats: TeacherSchoolStat[]
}

export default function TeacherHistoryTable() {
  const [data, setData] = useState<HistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/teacher-attendance/summary")
      if (!res.ok) throw new Error("Failed to fetch history")
      setData(await res.json())
    } catch {
      setError("Failed to load staff attendance history")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const columnDefs = useMemo<ColDef<TeacherSchoolStat>[]>(
    () => [
      {
        headerName: "",
        field: "profilePicture",
        width: 55,
        cellRenderer: (params: ICellRendererParams<TeacherSchoolStat>) => {
          const pic = params.data?.profilePicture
          const name = params.data?.name ?? "?"
          if (pic) {
            return (
              <div className="flex items-center justify-center h-full">
                <img
                  src={pic}
                  alt={name}
                  className="h-8 w-8 rounded-full object-cover"
                />
              </div>
            )
          }
          return (
            <div className="flex items-center justify-center h-full">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-medium">
                {name.charAt(0).toUpperCase()}
              </div>
            </div>
          )
        },
        sortable: false,
        filter: false,
      },
      {
        headerName: "Employee ID",
        field: "employeeId",
        width: 120,
        sort: "asc",
      },
      { headerName: "Name", field: "name", flex: 1, minWidth: 160 },
      {
        headerName: "Working Days",
        field: "totalWorkingDays",
        width: 120,
        cellRenderer: (params: { value: number }) => (
          <span className="font-medium text-foreground">{params.value}</span>
        ),
      },
      {
        headerName: "Present",
        field: "totalPresent",
        width: 90,
        cellRenderer: (params: { value: number }) => (
          <span className="text-green-700 dark:text-green-400 font-medium">{params.value}</span>
        ),
      },
      {
        headerName: "Absent",
        field: "totalAbsent",
        width: 90,
        cellRenderer: (params: { value: number }) => (
          <span className="text-red-600 dark:text-red-400 font-medium">{params.value}</span>
        ),
      },
      {
        headerName: "Late",
        field: "totalLate",
        width: 70,
        cellRenderer: (params: { value: number }) => (
          <span className="text-amber-600 dark:text-amber-400 font-medium">{params.value}</span>
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
    [],
  )

  if (loading) {
    return <Skeleton className="h-64 w-full rounded-xl" />
  }

  if (error) {
    return <p className="text-sm text-destructive text-center py-8">{error}</p>
  }

  if (!data) return null

  if (!data.sessionStartedOn) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Session start date not configured. Set it from the super-admin panel.
      </p>
    )
  }

  if (data.stats.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No active teachers found.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Session from {new Date(data.sessionStartedOn).toLocaleDateString()}
      </div>
      <div className="ag-theme-quartz w-full" style={{ height: 500 }}>
        <AgGridReact
          modules={[AllCommunityModule]}
          rowData={data.stats}
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
