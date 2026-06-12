"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AgGridReact } from "ag-grid-react"
import { AllCommunityModule } from "ag-grid-community"
import type { ColDef, ICellRendererParams } from "ag-grid-community"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import ClassFilter from "./ClassFilter"
import type { ClassStudentStat } from "@/schemas/attendance.schema"

interface AdminStudentHistoryViewProps {
  classSections: { class: string; section: string }[]
}

interface HistoryResponse {
  class: string
  section: string
  sessionStartedOn: string | null
  stats: ClassStudentStat[]
}

export default function AdminStudentHistoryView({
  classSections,
}: AdminStudentHistoryViewProps) {
  // Default to the first class so the table isn't empty on first load.
  const initialClass = useMemo(() => {
    const first = classSections[0]
    return first ? `${first.class}|${first.section}` : ""
  }, [classSections])

  const [selectedClass, setSelectedClass] = useState<string>(initialClass)
  const [data, setData] = useState<HistoryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Keep selection in sync when classSections arrive after mount
  useEffect(() => {
    if (!selectedClass && initialClass) setSelectedClass(initialClass)
  }, [initialClass, selectedClass])

  const fetchHistory = useCallback(async () => {
    if (!selectedClass || selectedClass === "all") return
    const [cls, sec] = selectedClass.split("|")
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/attendance/summary?class=${encodeURIComponent(cls)}&section=${encodeURIComponent(sec)}`,
      )
      if (!res.ok) throw new Error("Failed to fetch history")
      setData(await res.json())
    } catch {
      setError("Failed to load attendance history")
    } finally {
      setLoading(false)
    }
  }, [selectedClass])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const columnDefs = useMemo<ColDef<ClassStudentStat>[]>(
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
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-medium">
                {name.charAt(0).toUpperCase()}
              </div>
            </div>
          )
        },
        sortable: false,
        filter: false,
      },
      { headerName: "Roll", field: "rollNo", width: 70, sort: "asc" },
      { headerName: "Name", field: "name", flex: 1, minWidth: 140 },
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

  if (classSections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No active classes found.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <ClassFilter
        classSections={classSections}
        selected={selectedClass}
        onChange={(v) => setSelectedClass(v === "all" ? initialClass : v)}
      />

      {loading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : error ? (
        <p className="text-sm text-destructive text-center py-8">{error}</p>
      ) : !data ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Select a class to view history.
        </p>
      ) : !data.sessionStartedOn ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Session start date not configured. Set it from the super-admin panel.
        </p>
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}
