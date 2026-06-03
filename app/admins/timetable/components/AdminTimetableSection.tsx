"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Pencil, Save, Settings2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import TimetableGridView from "@/components/timetable-grid-view"
import GroupSelector from "./GroupSelector"
import AddGroupModal from "./AddGroupModal"
import AssignCellModal from "./AssignCellModal"
import ConfirmSaveModal from "./ConfirmSaveModal"
import ManagePeriodsSheet from "./ManagePeriodsSheet"
import type {
  BatchChange,
  BatchSaveResult,
  DayOfWeek,
  PeriodRow,
  TimetableCell,
  TimetableGrid,
} from "@/schemas/timetable.schema"
import type { TimetableGroupRow } from "@/schemas/timetable-group.schema"

interface ModalState {
  open: boolean
  period: PeriodRow | null
  day: DayOfWeek | null
  existingCell?: TimetableCell
}

const EMPTY_MODAL: ModalState = { open: false, period: null, day: null }

export default function AdminTimetableSection() {
  // ─── Groups ─────────────────────────────────────────────────────────────
  const [groups, setGroups] = useState<TimetableGroupRow[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [showAddGroup, setShowAddGroup] = useState(false)

  // ─── Selected-group data ────────────────────────────────────────────────
  const [periods, setPeriods] = useState<PeriodRow[]>([])
  const [grid, setGrid] = useState<TimetableGrid | null>(null)

  // ─── Edit mode + queue ──────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<BatchChange[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [managePeriodsOpen, setManagePeriodsOpen] = useState(false)
  const [cellModal, setCellModal] = useState<ModalState>(EMPTY_MODAL)

  // ─── Loading + errors ───────────────────────────────────────────────────
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [loadingGrid, setLoadingGrid] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  )

  // ─── Data loaders ───────────────────────────────────────────────────────
  const fetchGroups = useCallback(async () => {
    setLoadingGroups(true)
    setError(null)
    try {
      const res = await fetch("/api/timetable-groups")
      if (!res.ok) throw new Error()
      const data: TimetableGroupRow[] = await res.json()
      setGroups(data)
      // Keep the current selection if still present, else default to first group.
      setSelectedGroupId((prev) => {
        if (prev && data.some((g) => g.id === prev)) return prev
        return data[0]?.id ?? null
      })
    } catch {
      setError("Could not load timetable groups. Please refresh.")
    } finally {
      setLoadingGroups(false)
    }
  }, [])

  const fetchGroupData = useCallback(async (groupId: string) => {
    setLoadingGrid(true)
    setError(null)
    try {
      const [pRes, gRes] = await Promise.all([
        fetch(`/api/timetable/periods?groupId=${groupId}`),
        fetch(`/api/timetable?groupId=${groupId}`),
      ])
      if (!pRes.ok || !gRes.ok) throw new Error()
      const [pData, gData] = await Promise.all([pRes.json(), gRes.json()])
      setPeriods(pData)
      setGrid(gData)
    } catch {
      setError("Could not load timetable data for this group.")
    } finally {
      setLoadingGrid(false)
    }
  }, [])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  useEffect(() => {
    if (selectedGroupId) {
      fetchGroupData(selectedGroupId)
    } else {
      setPeriods([])
      setGrid(null)
    }
  }, [selectedGroupId, fetchGroupData])

  // ─── Edit mode handlers ─────────────────────────────────────────────────

  function enterEditMode() {
    setEditMode(true)
    setPendingChanges([])
  }

  function cancelEditMode() {
    if (pendingChanges.length > 0) {
      if (!confirm(`Discard ${pendingChanges.length} pending change(s)?`)) return
    }
    setPendingChanges([])
    setEditMode(false)
  }

  function handleCellClick(period: PeriodRow, day: DayOfWeek, existingCell?: TimetableCell) {
    if (!editMode) return
    setCellModal({ open: true, period, day, existingCell })
  }

  /**
   * When admin queues a CREATE/UPDATE/DELETE in the modal, we add it to the
   * change queue. For UPDATEs and DELETEs on the same cell we collapse so the
   * queue holds at most one entry per existing cell id.
   */
  function handleQueue(change: BatchChange) {
    setPendingChanges((prev) => {
      if (change.action === "CREATE") {
        return [...prev, change]
      }
      const targetId = change.id
      const filtered = prev.filter((c) =>
        c.action === "CREATE" ? true : c.id !== targetId,
      )
      return [...filtered, change]
    })
  }

  async function handleSave() {
    if (!selectedGroupId || pendingChanges.length === 0) return
    setSaving(true)
    try {
      const res = await fetch("/api/timetable/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: selectedGroupId, changes: pendingChanges }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message ?? "Failed to save changes")
        return
      }
      const result = data as BatchSaveResult
      toast.success(
        `Saved ${result.committed} change${result.committed === 1 ? "" : "s"}`,
      )
      if (result.warnings && result.warnings.length > 0) {
        toast.warning(
          `${result.warnings.length} cross-group time overlap${result.warnings.length === 1 ? "" : "s"} flagged`,
        )
      }
      setPendingChanges([])
      setEditMode(false)
      setConfirmOpen(false)
      await Promise.all([fetchGroupData(selectedGroupId), fetchGroups()])
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loadingGroups) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Timetable</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage and view the school schedule
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Group selector (always visible) */}
      <GroupSelector
        groups={groups}
        selectedGroupId={selectedGroupId}
        onSelect={(id) => {
          if (editMode && pendingChanges.length > 0) {
            if (!confirm("You have unsaved changes. Switch groups and discard them?")) return
            setPendingChanges([])
            setEditMode(false)
          }
          setSelectedGroupId(id)
        }}
        onAddGroup={() => setShowAddGroup(true)}
        onGroupUpdated={fetchGroups}
        hideAddButton={editMode}
      />

      {/* No groups yet */}
      {groups.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-xl p-10 text-center text-muted-foreground space-y-3">
          <p className="text-sm">
            No timetable structures yet. Create your first group to get started — for example,
            &quot;Primary&quot; for classes 1–5.
          </p>
          <Button onClick={() => setShowAddGroup(true)}>+ Add New Structure</Button>
        </div>
      ) : !selectedGroup ? null : (
        <>
          {/* Grid + toolbar */}
          {loadingGrid ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : grid ? (
            <TimetableGridView
              grid={grid}
              onCellClick={editMode ? handleCellClick : undefined}
              pendingChanges={editMode ? pendingChanges : []}
              toolbarRight={
                editMode ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setManagePeriodsOpen(true)}
                      className="gap-1.5"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      Manage Periods
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={cancelEditMode}
                      className="gap-1.5"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setConfirmOpen(true)}
                      disabled={pendingChanges.length === 0}
                      className="gap-1.5"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save Changes ({pendingChanges.length})
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddGroup(true)}
                      className="gap-1.5"
                    >
                      + Add New Structure
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={enterEditMode}
                      className="gap-1.5"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit Timetable
                    </Button>
                  </>
                )
              }
            />
          ) : null}
        </>
      )}

      {/* Modals + sheets */}
      <AddGroupModal
        open={showAddGroup}
        onClose={() => setShowAddGroup(false)}
        onSuccess={async () => {
          setShowAddGroup(false)
          await fetchGroups()
        }}
      />

      {selectedGroup && cellModal.open && cellModal.period && cellModal.day && (
        <AssignCellModal
          open={cellModal.open}
          groupId={selectedGroup.id}
          period={cellModal.period}
          dayOfWeek={cellModal.day}
          existingCell={cellModal.existingCell}
          groupClasses={selectedGroup.classes}
          onQueue={handleQueue}
          onClose={() => setCellModal(EMPTY_MODAL)}
        />
      )}

      {selectedGroup && (
        <ManagePeriodsSheet
          open={managePeriodsOpen}
          groupId={selectedGroup.id}
          groupName={selectedGroup.name}
          periods={periods}
          onRefresh={() => {
            if (selectedGroup) {
              fetchGroupData(selectedGroup.id)
              fetchGroups()
            }
          }}
          onClose={() => setManagePeriodsOpen(false)}
        />
      )}

      <ConfirmSaveModal
        open={confirmOpen}
        pendingCount={pendingChanges.length}
        saving={saving}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleSave}
      />
    </div>
  )
}
