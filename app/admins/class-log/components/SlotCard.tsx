"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookOpen, CheckCircle2, Clock, Pencil } from "lucide-react"

interface SlotCardLog {
  id: string
  topic: string
  description: string | null
  attachmentUrl: string | null
  attachmentType: string | null
}

interface SlotCardProps {
  timetableId: string
  subject: string
  class: string
  section: string
  periodLabel: string
  startTime: string
  endTime: string
  date: string
  log: SlotCardLog | null
  onLog: () => void
  disabled?: boolean
}

export function SlotCard({
  subject,
  class: cls,
  section,
  periodLabel,
  startTime,
  endTime,
  log,
  onLog,
  disabled = false,
}: SlotCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-start justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{subject}</p>
          <p className="text-sm text-muted-foreground">
            Class {cls} — {section} &nbsp;·&nbsp; {periodLabel}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="h-3 w-3" />
            {startTime} – {endTime}
          </p>
          {log && (
            <p className="text-sm text-muted-foreground mt-1.5 line-clamp-1">
              <span className="font-medium">Topic:</span> {log.topic}
            </p>
          )}
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-end gap-2">
        {log ? (
          <>
            <Badge className="bg-green-100 text-green-700 dark:text-green-400 hover:bg-green-100 gap-1">
              <CheckCircle2 className="h-3 w-3" /> Logged
            </Badge>
            <Button variant="ghost" size="sm" onClick={onLog} disabled={disabled} className="h-7 text-xs px-2">
              <Pencil className="h-3 w-3 mr-1" /> Edit
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={onLog} disabled={disabled}>
            Log Class
          </Button>
        )}
      </div>
    </div>
  )
}
