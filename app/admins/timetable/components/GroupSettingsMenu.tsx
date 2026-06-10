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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { TimetableGroupRow } from "@/schemas/timetable-group.schema"
import { cn } from "@/lib/utils"
import EditGroupModal from "./EditGroupModal"

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
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/timetable-groups/${group.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.message ?? "Failed to delete")
        return
      }
      toast.success(`"${group.name}" deleted`)
      setDeleteOpen(false)
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
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            disabled={deleting}
            className="text-red-500 focus:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditGroupModal
        open={editOpen}
        group={group}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {
          setEditOpen(false)
          onUpdated()
        }}
      />

      <Dialog
        open={deleteOpen}
        onOpenChange={(o) => {
          if (!o && !deleting) setDeleteOpen(false)
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete &quot;{group.name}&quot;?</DialogTitle>
            <DialogDescription>
              This permanently removes {group.period_count} period
              {group.period_count === 1 ? "" : "s"}, {group.entry_count} timetable assignment
              {group.entry_count === 1 ? "" : "s"}, and any class logs attached. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              loading={deleting}
              loadingText="Deleting…"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
