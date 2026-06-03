"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Trophy, Clock, CalendarClock, Users } from "lucide-react"

interface ContestSummary {
  title: string
  questions: number
  totalPoints: number
  durationMins: number
  startTime: string
  endTime: string
  class: string
  section: string
}

interface ConfirmContestModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  summary: ContestSummary
  submitting: boolean
}

function formatDT(iso: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function ConfirmContestModal({
  open,
  onClose,
  onConfirm,
  summary,
  submitting,
}: ConfirmContestModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Confirm Contest
          </DialogTitle>
          <DialogDescription>
            Review the contest details before publishing. Once created, it will go live automatically at the scheduled start time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3 text-sm">
            <p className="font-semibold text-foreground text-base">{summary.title}</p>

            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500 flex-shrink-0" />
                <span>Class {summary.class} — {summary.section}</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <span>{summary.questions} questions · {summary.totalPoints} pts</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <span>{summary.durationMins} minute{summary.durationMins !== 1 ? "s" : ""}</span>
              </div>
            </div>

            <div className="border-t border-border pt-3 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarClock className="h-4 w-4 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Starts</p>
                  <p>{formatDT(summary.startTime)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarClock className="h-4 w-4 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Ends</p>
                  <p>{formatDT(summary.endTime)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            loading={submitting}
            loadingText="Creating…"
            className="bg-green-600 hover:bg-green-700"
          >
            Create Contest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
