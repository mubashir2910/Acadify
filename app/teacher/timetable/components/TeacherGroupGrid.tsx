"use client"

import { useEffect, useRef, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import TimetableGridView from "@/components/timetable-grid-view"
import type { TimetableGrid } from "@/schemas/timetable.schema"
import type { TimetableGroupRow } from "@/schemas/timetable-group.schema"

/**
 * Read-only group browser for the teacher "Others" tab.
 * - Lists the school's timetable groups as pills (no settings menu).
 * - Loads the selected group's grid via /api/timetable?groupId=…
 * - Reuses the shared TimetableGridView without an onCellClick handler.
 */
export default function TeacherGroupGrid() {
  const [groups, setGroups] = useState<TimetableGroupRow[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [grid, setGrid] = useState<TimetableGrid | null>(null)
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [loadingGrid, setLoadingGrid] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Race-safe selector: abort the in-flight grid fetch when the teacher clicks
  // another pill quickly.
  const gridFetchRef = useRef<AbortController | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadingGroups(true)
    setError(null)
    fetch("/api/timetable-groups")
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data: TimetableGroupRow[]) => {
        if (cancelled) return
        setGroups(data)
        setSelectedGroupId((prev) => prev ?? data[0]?.id ?? null)
      })
      .catch(() => {
        if (!cancelled) setError("Could not load timetable groups.")
      })
      .finally(() => {
        if (!cancelled) setLoadingGroups(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedGroupId) {
      setGrid(null)
      return
    }
    gridFetchRef.current?.abort()
    const controller = new AbortController()
    gridFetchRef.current = controller
    setLoadingGrid(true)
    setError(null)
    fetch(`/api/timetable?groupId=${selectedGroupId}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data: TimetableGrid) => {
        if (controller.signal.aborted) return
        setGrid(data)
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return
        setError("Could not load this group's timetable.")
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingGrid(false)
      })
    return () => controller.abort()
  }, [selectedGroupId])

  if (loadingGroups) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    )
  }

  if (error && groups.length === 0) {
    return <p className="text-sm text-red-500">{error}</p>
  }

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No timetable groups have been set up yet.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {/* Group pills — read-only (no settings menu, no add). */}
      <div className="flex items-center gap-2 flex-wrap">
        {groups.map((group) => {
          const active = selectedGroupId === group.id
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => setSelectedGroupId(group.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {group.name}
              <span
                className={cn(
                  "text-[10px]",
                  active ? "text-background/70" : "text-muted-foreground/70",
                )}
              >
                {group.classes.length} class{group.classes.length === 1 ? "" : "es"}
              </span>
            </button>
          )
        })}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loadingGrid ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : grid ? (
        <TimetableGridView grid={grid} />
      ) : null}
    </div>
  )
}
