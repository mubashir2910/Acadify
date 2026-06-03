"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
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
import type { ClassSectionInput } from "@/schemas/timetable-group.schema"

interface AddGroupModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddGroupModal({ open, onClose, onSuccess }: AddGroupModalProps) {
  const [name, setName] = useState("")
  const [available, setAvailable] = useState<ClassSectionInput[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch("/api/timetable-groups/available-classes")
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data: ClassSectionInput[]) => setAvailable(data))
      .catch(() => setError("Failed to load classes"))
      .finally(() => setLoading(false))
  }, [open])

  function key(c: ClassSectionInput) {
    return `${c.class}__${c.section}`
  }

  function toggle(c: ClassSectionInput) {
    const k = key(c)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError("Group name is required")

    const classes = available.filter((c) => selected.has(key(c)))

    setSubmitting(true)
    try {
      const res = await fetch("/api/timetable-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), classes }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.message ?? "Failed to create group")
        return
      }
      toast.success(`"${name.trim()}" created`)
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
        if (!o) onClose()
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Timetable Group</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g. Primary, Secondary, KG Section"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Choose a name that reflects the academic stage this schedule serves.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Classes</Label>
            <p className="text-[11px] text-muted-foreground">
              Pick the classes that follow this schedule. Classes already in another group are
              hidden.
            </p>
            {loading ? (
              <p className="text-sm text-muted-foreground py-3">Loading…</p>
            ) : available.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center text-xs text-muted-foreground">
                All known classes already belong to a group. You can add classes later from the
                group menu.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {available.map((c) => {
                  const k = key(c)
                  const checked = selected.has(k)
                  return (
                    <label
                      key={k}
                      className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent/50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(c)}
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
            <Button type="submit" loading={submitting} loadingText="Creating…">
              Create Group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
