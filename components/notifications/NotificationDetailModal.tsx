"use client"

import { useState } from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import { Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { NotificationItem } from "@/schemas/notifications.schema"
import { audienceLabel } from "./utils"

interface NotificationDetailModalProps {
  notification: NotificationItem | null
  open: boolean
  onClose: () => void
  canDelete: boolean
  onDeleted: (id: string) => void
}

export function NotificationDetailModal({
  notification,
  open,
  onClose,
  canDelete,
  onDeleted,
}: NotificationDetailModalProps) {
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleDelete() {
    if (!notification) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`/api/notifications/${notification.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error()
      toast.success("Notification deleted")
      onDeleted(notification.id)
      onClose()
    } catch {
      toast.error("Failed to delete notification")
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  function handleClose() {
    setConfirmDelete(false)
    onClose()
  }

  if (!notification) return null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug pr-4">
            {notification.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            {audienceLabel(
              notification.target_audience,
              notification.target_class,
              notification.target_section
            )}
          </Badge>
          <span className="text-xs text-slate-500">
            From {notification.created_by_name ?? "Deleted User"} ·{" "}
            {format(new Date(notification.created_at), "dd MMM yyyy, h:mm a")}
          </span>
        </div>

        {/* Scrollable message body */}
        <div className="max-h-[50vh] overflow-y-auto">
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {notification.message}
          </p>
        </div>

        {canDelete && (
          <DialogFooter>
            {confirmDelete ? (
              <div className="flex items-center gap-2 w-full justify-end">
                <span className="text-sm text-slate-500">Are you sure?</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Yes, delete"}
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
