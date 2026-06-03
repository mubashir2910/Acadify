"use client"

import { useState } from "react"
import { MoreVertical, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import type { TimetableGroupRow } from "@/schemas/timetable-group.schema"
import { cn } from "@/lib/utils"

interface GroupSettingsMenuProps {
  group: TimetableGroupRow
  onUpdated: () => void
  triggerClassName?: string
}

export default function GroupSettingsMenu({
  group,
  onUpdated,
  triggerClassName,
}: GroupSettingsMenuProps) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState(group.name)
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)

  async function handleRename(e: React.FormEvent) {
    e.preventDefault()
    setRenameError(null)
    if (!renameValue.trim()) return setRenameError("Name is required")
    setRenaming(true)
    try {
      const res = await fetch(`/api/timetable-groups/${group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        setRenameError(data.message ?? "Failed to rename")
        return
      }
      toast.success("Group renamed")
      setRenameOpen(false)
      onUpdated()
    } catch {
      setRenameError("Something went wrong")
    } finally {
      setRenaming(false)
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        `Delete the "${group.name}" group? This is only allowed when it has no periods or assignments.`,
      )
    ) {
      return
    }
    setDeleting(true)
    try {
      const res = await fetch(`/api/timetable-groups/${group.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.message ?? "Failed to delete")
        return
      }
      toast.success(`"${group.name}" deleted`)
      onUpdated()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`${group.name} settings`}
            className={cn(
              "flex items-center justify-center hover:opacity-80 transition-opacity",
              triggerClassName,
            )}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onClick={() => {
              setRenameValue(group.name)
              setRenameOpen(true)
            }}
          >
            <Pencil className="h-3.5 w-3.5 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-500 focus:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={renameOpen}
        onOpenChange={(o) => {
          if (!o) setRenameOpen(false)
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename group</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRename} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rename-input">Name</Label>
              <Input
                id="rename-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                autoFocus
              />
            </div>
            {renameError && <p className="text-sm text-red-500">{renameError}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameOpen(false)}
                disabled={renaming}
              >
                Cancel
              </Button>
              <Button type="submit" loading={renaming} loadingText="Saving…">
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
