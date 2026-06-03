"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ConfirmSaveModalProps {
  open: boolean
  pendingCount: number
  saving: boolean
  onCancel: () => void
  onConfirm: () => void
}

export default function ConfirmSaveModal({
  open,
  pendingCount,
  saving,
  onCancel,
  onConfirm,
}: ConfirmSaveModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !saving) onCancel()
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirm Timetable Changes</DialogTitle>
          <DialogDescription>
            You are about to update {pendingCount} timetable assignment
            {pendingCount === 1 ? "" : "s"}.
          </DialogDescription>
        </DialogHeader>

        <div className="text-sm text-muted-foreground space-y-1.5">
          <p>These changes will affect:</p>
          <ul className="list-disc pl-5 space-y-0.5 text-xs">
            <li>Teacher routines</li>
            <li>Student routines</li>
            <li>Class schedules</li>
          </ul>
          <p className="pt-1">Do you want to continue?</p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} loading={saving} loadingText="Saving…">
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
