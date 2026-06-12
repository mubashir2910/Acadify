"use client"

import { useEffect, useMemo, useState } from "react"
import { Download } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { monthOptionsFrom } from "@/lib/month-options"

type Session = { id: string; name: string; is_current: boolean; start_date?: string }
type ClassGroup = { class: string; sections: string[] }

export default function ExportsTab() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [classes, setClasses] = useState<ClassGroup[]>([])
  const [sessionId, setSessionId] = useState("")
  const [cls, setCls] = useState("")
  const [section, setSection] = useState("")
  // monthKey format "YYYY-MM"
  const today = new Date()
  const [monthKey, setMonthKey] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`,
  )

  useEffect(() => {
    void fetch("/api/sessions")
      .then((r) => r.ok && r.json())
      .then((data: Session[]) => {
        setSessions(data ?? [])
        const current = (data ?? []).find((s) => s.is_current)
        if (current) setSessionId(current.id)
      })
      .catch(() => {})
    void fetch("/api/admin/classes")
      .then((r) => r.ok && r.json())
      .then((data) => setClasses(data?.classes ?? []))
      .catch(() => {})
  }, [])

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === sessionId),
    [sessions, sessionId],
  )

  const monthOptions = useMemo(() => {
    const seed = selectedSession?.start_date
      ? new Date(selectedSession.start_date)
      : new Date()
    return monthOptionsFrom(seed, 12)
  }, [selectedSession])

  const selectedClassGroup = useMemo(
    () => classes.find((c) => c.class === cls),
    [classes, cls],
  )

  const parsedMonth = useMemo(() => {
    if (!monthKey) return { year: "", month: "" }
    const [year, month] = monthKey.split("-")
    return { year, month: String(Number(month)) }
  }, [monthKey])

  async function download(type: string, params: URLSearchParams) {
    try {
      const res = await fetch(`/api/fees/exports/${type}?${params.toString()}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.message ?? "Failed to export")
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const disposition = res.headers.get("Content-Disposition") ?? ""
      const match = /filename="([^"]+)"/.exec(disposition)
      a.download = match?.[1] ?? `${type}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      toast.error("Failed to download")
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="space-y-1">
          <label className="text-xs font-medium">Session</label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
          >
            <option value="">All sessions</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Class</label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:bg-muted"
            value={cls}
            onChange={(e) => {
              setCls(e.target.value)
              setSection("")
            }}
            disabled={classes.length === 0}
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.class} value={c.class}>
                {c.class}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Section</label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:bg-muted"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            disabled={!selectedClassGroup}
          >
            <option value="">All sections</option>
            {selectedClassGroup?.sections.map((sect) => (
              <option key={sect} value={sect}>
                {sect}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Month</label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
          >
            {monthOptions.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ExportCard
          title="Unpaid Students"
          description="Every outstanding ledger row with student contact + amount due."
          onClick={() => {
            const p = new URLSearchParams()
            if (sessionId) p.set("sessionId", sessionId)
            if (cls) p.set("class", cls)
            if (section) p.set("section", section)
            if (parsedMonth.month) p.set("month", parsedMonth.month)
            if (parsedMonth.year) p.set("year", parsedMonth.year)
            void download("unpaid", p)
          }}
        />
        <ExportCard
          title="Monthly Collections"
          description="All verified transactions in the chosen month."
          onClick={() => {
            const p = new URLSearchParams()
            if (cls) p.set("class", cls)
            if (section) p.set("section", section)
            if (parsedMonth.month) p.set("month", parsedMonth.month)
            if (parsedMonth.year) p.set("year", parsedMonth.year)
            void download("monthly-collections", p)
          }}
        />
        <ExportCard
          title="Pending Verifications"
          description="Hybrid uploads awaiting your approval."
          onClick={() => {
            void download("pending-verifications", new URLSearchParams())
          }}
        />
        <ExportCard
          title="Class Fee Report"
          description="Per-student totals (expected/paid/due) for the selected class. Requires class."
          onClick={() => {
            if (!cls) {
              toast.error("Class is required for this export")
              return
            }
            const p = new URLSearchParams()
            if (sessionId) p.set("sessionId", sessionId)
            p.set("class", cls)
            if (section) p.set("section", section)
            void download("class-report", p)
          }}
        />
      </div>
    </div>
  )
}

function ExportCard({
  title,
  description,
  onClick,
}: {
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <div className="rounded-md border border-border bg-card p-4 space-y-2">
      <h4 className="font-semibold text-sm">{title}</h4>
      <p className="text-xs text-muted-foreground">{description}</p>
      <Button variant="outline" size="sm" onClick={onClick}>
        <Download className="h-4 w-4 mr-1" /> Download CSV
      </Button>
    </div>
  )
}
