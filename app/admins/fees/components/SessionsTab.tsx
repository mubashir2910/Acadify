"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

type Session = {
  id: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean
}

export default function SessionsTab() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isCurrent, setIsCurrent] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/sessions")
      if (res.ok) setSessions(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, startDate, endDate, isCurrent }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.message ?? "Failed to create session")
        return
      }
      toast.success("Session created")
      setName("")
      setStartDate("")
      setEndDate("")
      await load()
    } finally {
      setCreating(false)
    }
  }

  async function setCurrent(id: string) {
    const res = await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCurrent: true }),
    })
    if (!res.ok) {
      toast.error("Failed to set current session")
      return
    }
    toast.success("Current session updated")
    await load()
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={create}
        className="grid gap-3 md:grid-cols-5 items-end rounded-md border border-border bg-muted/30 p-4"
      >
        <div className="space-y-1">
          <label className="text-xs font-medium">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="2025-26"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Start date</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">End date</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
        <label className="flex items-center gap-2 text-xs font-medium pb-2">
          <input
            type="checkbox"
            checked={isCurrent}
            onChange={(e) => setIsCurrent(e.target.checked)}
          />
          Set as current
        </label>
        <Button type="submit" loading={creating} loadingText="Creating…">
          Add Session
        </Button>
      </form>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading sessions…
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sessions yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Start</th>
                <th className="text-left px-3 py-2">End</th>
                <th className="text-left px-3 py-2">Current</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{s.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(s.start_date).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(s.end_date).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    {s.is_current ? (
                      <span className="rounded bg-emerald-100 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-xs">
                        Current
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {!s.is_current && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrent(s.id)}
                      >
                        Make current
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
