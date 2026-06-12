"use client"

import { useEffect, useState } from "react"
import { Loader2, History } from "lucide-react"

type HistoryEntry = {
  id: string
  previous_status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED"
  new_status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED"
  previous_ends_at: string | null
  new_ends_at: string | null
  reason: string | null
  created_at: string
  changedBy: { id: string; name: string; role: string } | null
}

const STATUS_TONE: Record<string, string> = {
  TRIAL: "bg-yellow-100 text-yellow-700 dark:text-yellow-400",
  ACTIVE: "bg-emerald-100 text-emerald-700 dark:text-emerald-400",
  SUSPENDED: "bg-red-100 text-red-700 dark:text-red-400",
  CANCELLED: "bg-muted text-foreground",
}

function fmtDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface SubscriptionHistoryProps {
  schoolCode: string
  /** Bumping this prop refetches — used after a successful subscription update */
  refreshKey?: number
}

export default function SubscriptionHistory({
  schoolCode,
  refreshKey = 0,
}: SubscriptionHistoryProps) {
  const [items, setItems] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/schools/${schoolCode}/subscription/history`,
        )
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.message ?? "Failed to load history")
        }
        const data = (await res.json()) as HistoryEntry[]
        if (!cancelled) setItems(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load history")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [schoolCode, refreshKey])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading history…
      </div>
    )
  }

  if (error) {
    return <p className="text-xs text-destructive">{error}</p>
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <History className="h-3.5 w-3.5" />
        No subscription changes recorded yet.
      </div>
    )
  }

  return (
    <ol className="relative border-l border-border ml-1.5">
      {items.map((entry) => (
        <li key={entry.id} className="ml-4 py-2.5">
          <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-slate-400" />
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                STATUS_TONE[entry.previous_status] ?? "bg-muted"
              }`}
            >
              {entry.previous_status}
            </span>
            <span className="text-xs text-muted-foreground">→</span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                STATUS_TONE[entry.new_status] ?? "bg-muted"
              }`}
            >
              {entry.new_status}
            </span>
            <span className="ml-auto text-[11px] text-muted-foreground">
              {fmtDateTime(entry.created_at)}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground space-y-0.5">
            {(entry.previous_ends_at || entry.new_ends_at) && (
              <div>
                End date: {fmtDate(entry.previous_ends_at)} →{" "}
                <span className="text-foreground font-medium">
                  {fmtDate(entry.new_ends_at)}
                </span>
              </div>
            )}
            {entry.changedBy && (
              <div>By: {entry.changedBy.name}</div>
            )}
            {entry.reason && (
              <div className="text-amber-700 dark:text-amber-400">
                <span className="font-medium">Reason: </span>
                {entry.reason}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
