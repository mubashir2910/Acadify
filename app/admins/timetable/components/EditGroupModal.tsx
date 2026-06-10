"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type {
  ClassSectionInput,
  TimetableGroupClassRow,
  TimetableGroupRow,
} from "@/schemas/timetable-group.schema"

interface EditGroupModalProps {
  open: boolean
  group: TimetableGroupRow
  onClose: () => void
  onSuccess: () => void
}

function classKey(c: { class: string; section: string }) {
  return `${c.class}__${c.section}`
}

export default function EditGroupModal({
  open,
  group,
  onClose,
  onSuccess,
}: EditGroupModalProps) {
  const [name, setName] = useState(group.name)

  // Local set of class-keys the admin wants to remove on save.
  const [toRemove, setToRemove] = useState<Set<string>>(new Set())

  // Available unassigned classes pulled from the API.
  const [available, setAvailable] = useState<ClassSectionInput[]>([])
  const [toAdd, setToAdd] = useState<Set<string>>(new Set())

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Inline message shown when admin tries to remove a class that has entries.
  const [blockedRemoveKey, setBlockedRemoveKey] = useState<string | null>(null)

  // Re-initialize all state every time the modal opens.
  useEffect(() => {
    if (!open) return
    setName(group.name)
    setToRemove(new Set())
    setToAdd(new Set())
    setError(null)
    setBlockedRemoveKey(null)
    setLoading(true)
    fetch("/api/timetable-groups/available-classes")
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data: ClassSectionInput[]) => setAvailable(data))
      .catch(() => setError("Failed to load available classes"))
      .finally(() => setLoading(false))
  }, [open, group.id, group.name])

  function toggleRemove(c: TimetableGroupClassRow) {
    const k = classKey(c)
    // Refuse to mark for removal if there are entries — admin must clear them first.
    if (c.entry_count > 0 && !toRemove.has(k)) {
      setBlockedRemoveKey(k)
      return
    }
    setBlockedRemoveKey(null)
    setToRemove((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  function toggleAdd(c: ClassSectionInput) {
    const k = classKey(c)
    setToAdd((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    if (!trimmedName) return setError("Group name is required")

    const removals = group.classes
      .filter((c) => toRemove.has(classKey(c)))
      .map((c) => ({ class: c.class, section: c.section }))
    const additions = available
      .filter((c) => toAdd.has(classKey(c)))
      .map((c) => ({ class: c.class, section: c.section }))

    // Single atomic PATCH — the backend wraps rename + removes + adds in one
    // transaction so a mid-flight failure leaves nothing applied.
    const body: {
      name?: string
      addClasses?: typeof additions
      removeClasses?: typeof removals
    } = {}
    if (trimmedName !== group.name) body.name = trimmedName
    if (additions.length > 0) body.addClasses = additions
    if (removals.length > 0) body.removeClasses = removals

    // Nothing to do.
    if (Object.keys(body).length === 0) {
      toast.success("No changes to save")
      onSuccess()
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/timetable-groups/${group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        // If backend tagged the offending class, surface it in the message.
        const offending = data.offendingClass as
          | { class: string; section: string }
          | undefined
        if (offending) {
          setError(
            `${data.message ?? "Failed to update"} — Class ${offending.class}–${offending.section}`,
          )
        } else {
          setError(data.message ?? "Failed to update group")
        }
        return
      }
      toast.success("Group updated")
      onSuccess()
    } catch {
      setError("Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !submitting) onClose()
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Group</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Current classes */}
          <div className="space-y-1.5">
            <Label>Current classes</Label>
            <p className="text-[11px] text-muted-foreground">
              Click X to mark a class for removal. Classes with timetable assignments must be
              cleared first.
            </p>
            {group.classes.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No classes are assigned to this group yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {group.classes.map((c) => {
                  const k = classKey(c)
                  const markedForRemoval = toRemove.has(k)
                  return (
                    <span
                      key={k}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                        markedForRemoval
                          ? "bg-red-100 text-red-700 dark:text-red-400 line-through dark:bg-red-950/50 dark:text-red-300"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      Class {c.class}–{c.section}
                      <span className="text-[10px] text-muted-foreground">
                        ({c.entry_count})
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleRemove(c)}
                        className="ml-0.5 opacity-60 hover:opacity-100"
                        aria-label={
                          markedForRemoval
                            ? `Restore Class ${c.class}–${c.section}`
                            : `Remove Class ${c.class}–${c.section}`
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}
            {blockedRemoveKey && (
              <div className="mt-1 flex items-start gap-1.5 rounded-md border border-amber-300 dark:border-amber-700 bg-amber-500/10 dark:bg-amber-950/40 p-2 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span className="text-amber-700 dark:text-amber-300">
                  This class still has timetable assignments. Clear them from the grid first, or
                  delete the entire group.
                </span>
              </div>
            )}
          </div>

          {/* Add classes */}
          <div className="space-y-1.5">
            <Label>Add classes</Label>
            <p className="text-[11px] text-muted-foreground">
              Classes available below are not currently in any group.
            </p>
            {loading ? (
              <p className="text-sm text-muted-foreground py-2">Loading…</p>
            ) : available.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                All known classes already belong to a group.
              </p>
            ) : (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {available.map((c) => {
                  const k = classKey(c)
                  return (
                    <label
                      key={k}
                      className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent/50"
                    >
                      <input
                        type="checkbox"
                        checked={toAdd.has(k)}
                        onChange={() => toggleAdd(c)}
                        className="rounded border-slate-300"
                      />
                      <span>
                        Class {c.class} – {c.section}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting} loadingText="Saving…">
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
