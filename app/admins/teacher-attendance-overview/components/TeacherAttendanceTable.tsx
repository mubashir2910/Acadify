"use client"

import { useMemo, useState } from "react"
import { AgGridReact } from "ag-grid-react"
import { AllCommunityModule } from "ag-grid-community"
import type { ColDef } from "ag-grid-community"
import { Badge } from "@/components/ui/badge"
import { Pencil } from "lucide-react"
import type { ICellRendererParams } from "ag-grid-community"
import EditTeacherAttendanceModal from "./EditTeacherAttendanceModal"
import type { TeacherAttendanceRecord } from "@/schemas/teacher-attendance.schema"

interface TeacherAttendanceTableProps {
  teachers: TeacherAttendanceRecord[]
  date: string
  onRefresh: () => void
}

export default function TeacherAttendanceTable({ teachers, date, onRefresh }: TeacherAttendanceTableProps) {
  const [editTeacher, setEditTeacher] = useState<TeacherAttendanceRecord | null>(null)

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "",
        field: "profilePicture",
        width: 55,
        cellRenderer: (params: ICellRendererParams<TeacherAttendanceRecord>) => {
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
        headerName: "Name",
        field: "name",
        flex: 1,
        minWidth: 140,
        sort: "asc",
      },
      {
        headerName: "Employee ID",
        field: "employeeId",
        width: 130,
      },
      {
        headerName: "Status",
        field: "status",
        width: 110,
        cellRenderer: (params: { value: string | null }) => {
          if (!params.value) return <span className="text-muted-foreground">—</span>
          const map: Record<string, { label: string; className: string }> = {
            PRESENT: { label: "Present", className: "bg-green-100 text-green-800 hover:bg-green-200" },
            ABSENT:  { label: "Absent",  className: "bg-red-100 text-red-800 hover:bg-red-200" },
            LATE:    { label: "Late",    className: "bg-amber-100 text-amber-800 hover:bg-amber-200" },
          }
          const info = map[params.value]
          if (!info) return params.value
          return <Badge className={info.className}>{info.label}</Badge>
        },
      },
      {
        headerName: "Edit",
        field: "teacherId",
        width: 60,
        cellRenderer: (params: ICellRendererParams<TeacherAttendanceRecord>) => {
          if (!params.data) return null
          return (
            <div className="flex items-center justify-center h-full">
              <button
                type="button"
                onClick={() => setEditTeacher(params.data!)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                aria-label="Edit attendance"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        },
        sortable: false,
        filter: false,
      },
      {
        headerName: "Last Edited",
        field: "lastEditedAt",
        width: 140,
        valueFormatter: (params: { value: string | null }) =>
          params.value
            ? new Date(params.value).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—",
      },
      {
        headerName: "Edited By",
        field: "lastEditedBy",
        width: 130,
        valueFormatter: (params: { value: string | null }) => params.value ?? "—",
      },
    ],
    []
  )

  if (teachers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No active teachers found.
      </p>
    )
  }

  return (
    <>
      <div className="ag-theme-quartz w-full" style={{ height: 480 }}>
        <AgGridReact
          modules={[AllCommunityModule]}
          rowData={teachers}
          columnDefs={columnDefs}
          rowHeight={48}
          pagination
          paginationPageSize={30}
          suppressMovableColumns
        />
      </div>

      {editTeacher && (
        <EditTeacherAttendanceModal
          open={!!editTeacher}
          onClose={() => setEditTeacher(null)}
          onSuccess={() => { setEditTeacher(null); onRefresh() }}
          teacherName={editTeacher.name}
          teacherId={editTeacher.teacherId}
          currentStatus={editTeacher.status}
          date={date}
        />
      )}
    </>
  )
}
