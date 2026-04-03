"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import PeriodFormModal from "./PeriodFormModal"
import type { PeriodRow } from "@/schemas/timetable.schema"

interface PeriodStructureManagerProps {
  periods: PeriodRow[]
  onRefresh: () => void
}

export default function PeriodStructureManager({ periods, onRefresh }: PeriodStructureManagerProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [editPeriod, setEditPeriod] = useState<PeriodRow | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)

  async function handleDelete(period: PeriodRow) {
    if (!confirm(`Delete "${period.label}"? This cannot be undone.`)) return
    setDeletingId(period.id)
    try {
      const res = await fetch(`/api/timetable/periods/${period.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.message ?? "Failed to delete period")
        return
      }
      toast.success(`"${period.label}" deleted`)
      onRefresh()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setDeletingId(null)
    }
  }

  async function moveOrder(period: PeriodRow, direction: "up" | "down") {
    const sorted = [...periods].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex((p) => p.id === period.id)
    const swapIdx = direction === "up" ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const swapped = sorted[swapIdx]
    const updated = sorted.map((p) => ({ id: p.id, order: p.order }))
    const a = updated.find((p) => p.id === period.id)!
    const b = updated.find((p) => p.id === swapped.id)!
    const tmpOrder = a.order
    a.order = b.order
    b.order = tmpOrder

    setReordering(true)
    try {
      const res = await fetch("/api/timetable/periods/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periods: updated }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.message ?? "Failed to reorder")
        return
      }
      onRefresh()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setReordering(false)
    }
  }

  const sorted = [...periods].sort((a, b) => a.order - b.order)
  const nextOrder = sorted.length > 0 ? sorted[sorted.length - 1].order + 1 : 1

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          Period Structure ({periods.length} periods)
        </h3>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add Period
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-muted-foreground text-sm">
          No periods yet. Add your first period to get started.
        </div>
      ) : (
        <div className="space-y-1.5">
          {sorted.map((period, idx) => (
            <div
              key={period.id}
              className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2.5"
            >
              {/* Reorder buttons */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveOrder(period, "up")}
                  disabled={idx === 0 || reordering}
                  className="text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  onClick={() => moveOrder(period, "down")}
                  disabled={idx === sorted.length - 1 || reordering}
                  className="text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>

              <span className="text-xs text-muted-foreground w-5 text-center">{idx + 1}</span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800">{period.label}</span>
                  {period.is_break && (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px] py-0">
                      Break
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {period.start_time} – {period.end_time}
                </p>
              </div>

              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-slate-500 hover:text-slate-700"
                  onClick={() => setEditPeriod(period)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-red-400 hover:text-red-600"
                  disabled={deletingId === period.id}
                  onClick={() => handleDelete(period)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <PeriodFormModal
          mode="create"
          lastPeriodEndTime={sorted[sorted.length - 1]?.end_time}
          defaultOrder={nextOrder}
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false)
            onRefresh()
          }}
        />
      )}

      {editPeriod && (
        <PeriodFormModal
          mode="edit"
          period={editPeriod}
          onClose={() => setEditPeriod(null)}
          onSuccess={() => {
            setEditPeriod(null)
            onRefresh()
          }}
        />
      )}
    </div>
  )
}
