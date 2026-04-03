"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react"

interface SubmitConfirmationModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  counts: { present: number; absent: number; late: number; unmarked: number }
  total: number
  isEditing: boolean
  submitting: boolean
}

export default function SubmitConfirmationModal({
  open,
  onClose,
  onConfirm,
  counts,
  total,
  isEditing,
  submitting,
}: SubmitConfirmationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {isEditing ? "Update Attendance" : "Confirm Submission"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Review attendance before submitting.
          </p>
        </DialogHeader>

        {/* Summary */}
        <div className="rounded-xl bg-slate-50 p-4 space-y-3">
          <SummaryRow
            icon={<CheckCircle className="h-4 w-4 text-green-600" />}
            label="Present"
            value={counts.present}
            color="text-green-600"
          />
          <SummaryRow
            icon={<XCircle className="h-4 w-4 text-red-600" />}
            label="Absent"
            value={counts.absent}
            color="text-red-600"
          />
          <SummaryRow
            icon={<Clock className="h-4 w-4 text-amber-500" />}
            label="Late"
            value={counts.late}
            color="text-amber-600"
          />
          <hr />
          <SummaryRow label="Total Students" value={total} bold />
        </div>

        {/* Warning for unmarked students */}
        {counts.unmarked > 0 && (
          <div className="flex gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p>
              <strong>{counts.unmarked} student{counts.unmarked > 1 ? "s" : ""}</strong>{" "}
              not marked. They will be recorded as absent.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-green-700 hover:bg-green-800 text-white"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : isEditing ? "Update" : "Submit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SummaryRow({
  icon,
  label,
  value,
  color,
  bold,
}: {
  icon?: React.ReactNode
  label: string
  value: number
  color?: string
  bold?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className={bold ? "font-semibold" : "text-sm"}>{label}</span>
      </div>
      <span className={cn("font-semibold", color)}>{value}</span>
    </div>
  )
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
