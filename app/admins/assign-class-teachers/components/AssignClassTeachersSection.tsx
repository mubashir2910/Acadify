"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { AgGridReact } from "ag-grid-react"
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community"
import type { ColDef, ValueGetterParams } from "ag-grid-community"
import { Plus, ArrowLeftRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import AssignModal from "./AssignModal"
import ChangeModal from "./ChangeModal"

ModuleRegistry.registerModules([AllCommunityModule])

interface Assignment {
  id: string
  class: string
  section: string
  assigned_at: string
  teacher: {
    id: string
    employee_id: string
    status: string
    user: { name: string }
  }
}

export function AssignClassTeachersSection() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showChangeModal, setShowChangeModal] = useState(false)

  const fetchAssignments = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch("/api/class-teachers")
      if (!res.ok) throw new Error("Failed to fetch assignments")
      setAssignments(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  const colDefs = useMemo<ColDef<Assignment>[]>(
    () => [
      { headerName: "Class", field: "class", flex: 1, minWidth: 100 },
      { headerName: "Section", field: "section", flex: 1, minWidth: 100 },
      {
        headerName: "Teacher Name",
        flex: 2,
        minWidth: 180,
        valueGetter: (p: ValueGetterParams<Assignment>) =>
          p.data?.teacher.user.name,
      },
      {
        headerName: "Employee ID",
        flex: 1,
        minWidth: 130,
        cellClass: "font-mono text-xs",
        valueGetter: (p: ValueGetterParams<Assignment>) =>
          p.data?.teacher.employee_id,
      },
      {
        headerName: "Assigned On",
        flex: 1,
        minWidth: 120,
        valueGetter: (p: ValueGetterParams<Assignment>) =>
          p.data?.assigned_at
            ? new Date(p.data.assigned_at).toLocaleDateString()
            : "—",
      },
    ],
    []
  )

  function handleMutationSuccess() {
    setShowAssignModal(false)
    setShowChangeModal(false)
    setLoading(true)
    fetchAssignments()
  }

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />
  if (error) return <p className="text-sm text-destructive">{error}</p>

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex gap-3">
        <Button size="sm" onClick={() => setShowAssignModal(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Assign
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowChangeModal(true)}
          disabled={assignments.length === 0}
        >
          <ArrowLeftRight className="h-4 w-4 mr-1.5" /> Change
        </Button>
      </div>

      {/* Assignments table */}
      {assignments.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No class teacher assignments yet. Click &quot;Assign&quot; to get
            started.
          </p>
        </div>
      ) : (
        <div className="ag-theme-quartz" style={{ height: 500 }}>
          <AgGridReact
            rowData={assignments}
            columnDefs={colDefs}
            rowHeight={46}
            pagination
            paginationPageSize={50}
          />
        </div>
      )}

      {/* Modals */}
      {showAssignModal && (
        <AssignModal
          onClose={() => setShowAssignModal(false)}
          onSuccess={handleMutationSuccess}
        />
      )}
      {showChangeModal && (
        <ChangeModal
          onClose={() => setShowChangeModal(false)}
          onSuccess={handleMutationSuccess}
        />
      )}
    </div>
  )
}
