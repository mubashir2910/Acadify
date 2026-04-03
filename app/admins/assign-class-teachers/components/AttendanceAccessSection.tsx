"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { AgGridReact } from "ag-grid-react"
import { AllCommunityModule } from "ag-grid-community"
import type { ColDef, ICellRendererParams } from "ag-grid-community"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import GiveAttendanceAccessModal from "./GiveAttendanceAccessModal"
import type { AttendanceAccessGrant } from "@/schemas/attendance-access.schema"

const STATUS_BADGE: Record<string, string> = {
  Active:   "bg-green-100 text-green-800 hover:bg-green-100",
  Upcoming: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  Expired:  "bg-slate-100 text-slate-500 hover:bg-slate-100",
}

export default function AttendanceAccessSection() {
  const [grants, setGrants] = useState<AttendanceAccessGrant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showGiveModal, setShowGiveModal] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const fetchGrants = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch("/api/attendance-access")
      if (!res.ok) throw new Error("Failed to fetch access grants")
      setGrants(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchGrants() }, [fetchGrants])

  const handleRevoke = useCallback(async (id: string) => {
    if (!confirm("Revoke this attendance access? The teacher will immediately lose access.")) return
    setRevokingId(id)
    try {
      const res = await fetch(`/api/attendance-access/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to revoke")
      }
      toast.success("Attendance access revoked")
      setGrants((prev) => prev.filter((g) => g.id !== id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke")
    } finally {
      setRevokingId(null)
    }
  }, [])

  const colDefs = useMemo<ColDef<AttendanceAccessGrant>[]>(
    () => [
      {
        headerName: "Teacher",
        flex: 2,
        minWidth: 160,
        valueGetter: (p) => p.data?.teacher.user.name,
        sort: "asc",
      },
      {
        headerName: "Employee ID",
        flex: 1,
        minWidth: 120,
        cellClass: "font-mono text-xs",
        valueGetter: (p) => p.data?.teacher.employee_id,
      },
      {
        headerName: "Class",
        flex: 1,
        minWidth: 80,
        valueGetter: (p) => p.data ? `${p.data.class}-${p.data.section}` : "",
      },
      {
        headerName: "Start Date",
        flex: 1,
        minWidth: 110,
        valueGetter: (p) =>
          p.data?.startDate
            ? new Date(p.data.startDate + "T00:00:00").toLocaleDateString()
            : "—",
      },
      {
        headerName: "End Date",
        flex: 1,
        minWidth: 110,
        valueGetter: (p) =>
          p.data?.endDate
            ? new Date(p.data.endDate + "T00:00:00").toLocaleDateString()
            : "—",
      },
      {
        headerName: "Status",
        field: "status",
        width: 100,
        cellRenderer: (params: ICellRendererParams<AttendanceAccessGrant>) => {
          const s = params.data?.status
          if (!s) return null
          return (
            <div className="flex items-center h-full">
              <Badge className={STATUS_BADGE[s] ?? ""}>{s}</Badge>
            </div>
          )
        },
      },
      {
        headerName: "Actions",
        width: 90,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<AttendanceAccessGrant>) => {
          const id = params.data?.id
          if (!id) return null
          return (
            <div className="flex items-center h-full">
              <button
                type="button"
                disabled={revokingId === id}
                onClick={() => handleRevoke(id)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                aria-label="Revoke access"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        },
      },
    ],
    [handleRevoke, revokingId]
  )

  if (loading) return <Skeleton className="h-48 w-full rounded-xl" />
  if (error) return <p className="text-sm text-destructive">{error}</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Temporarily grant a subject teacher access to mark attendance for a class.
        </p>
        <Button size="sm" onClick={() => setShowGiveModal(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Give Access
        </Button>
      </div>

      {grants.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No attendance access grants yet. Click &quot;Give Access&quot; to add one.
          </p>
        </div>
      ) : (
        <div className="ag-theme-quartz" style={{ height: 400 }}>
          <AgGridReact
            modules={[AllCommunityModule]}
            rowData={grants}
            columnDefs={colDefs}
            rowHeight={46}
            pagination
            paginationPageSize={20}
            suppressMovableColumns
          />
        </div>
      )}

      {showGiveModal && (
        <GiveAttendanceAccessModal
          onClose={() => setShowGiveModal(false)}
          onSuccess={() => {
            setShowGiveModal(false)
            setLoading(true)
            fetchGrants()
          }}
        />
      )}
    </div>
  )
}
