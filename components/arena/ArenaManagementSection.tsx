"use client"

import { useEffect, useState, useCallback } from "react"
import { Trophy, Swords } from "lucide-react"
import { AgGridReact } from "ag-grid-react"
import { AllCommunityModule } from "ag-grid-community"
import type { ColDef } from "ag-grid-community"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TableSkeleton } from "@/components/ui/skeletons"

interface LeaderboardEntry {
  rank: number
  name: string
  totalPoints: number
  totalTimeMs: number
}

interface ClassSection {
  class: string
  section: string
}

function formatTime(ms: number) {
  if (!ms) return "—"
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}m ${s}s`
}

function rankDisplay(rank: number) {
  if (rank === 1) return "🥇"
  if (rank === 2) return "🥈"
  if (rank === 3) return "🥉"
  return `#${rank}`
}

const colDefs: ColDef<LeaderboardEntry>[] = [
  {
    headerName: "Rank",
    field: "rank",
    width: 80,
    cellRenderer: ({ value }: { value: number }) => rankDisplay(value),
  },
  {
    headerName: "Student Name",
    field: "name",
    flex: 2,
    minWidth: 160,
  },
  {
    headerName: "Points",
    field: "totalPoints",
    width: 100,
    valueFormatter: ({ value }) => `${value} pts`,
  },
  {
    headerName: "Time Taken",
    field: "totalTimeMs",
    width: 130,
    valueFormatter: ({ value }) => formatTime(value as number),
  },
]

type LeaderboardType = "monthly" | "accumulated"

export function ArenaManagementSection() {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [classSections, setClassSections] = useState<ClassSection[]>([])
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [lbType, setLbType] = useState<LeaderboardType>("monthly")
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [lbLoading, setLbLoading] = useState(false)

  // Fetch class-sections once
  useEffect(() => {
    fetch("/api/quiz/classes")
      .then((r) => r.json())
      .then((data: ClassSection[]) => setClassSections(data))
      .catch(() => {})
  }, [])

  const fetchLeaderboard = useCallback((classKey: string, type: LeaderboardType) => {
    if (!classKey) { setLeaderboard([]); return }
    setLbLoading(true)
    const selected = classSections.find((c) => `${c.class}-${c.section}` === classKey)
    const classSuffix = selected ? `&class=${selected.class}&section=${selected.section}` : ""
    const monthSuffix = type === "monthly" ? `&month=${currentMonth}` : ""

    fetch(`/api/arena/leaderboard?type=${type}${monthSuffix}${classSuffix}`)
      .then((r) => r.json())
      .then((data: { leaderboard: LeaderboardEntry[] }) => setLeaderboard(data.leaderboard ?? []))
      .catch(() => setLeaderboard([]))
      .finally(() => setLbLoading(false))
  }, [currentMonth, classSections])

  useEffect(() => {
    fetchLeaderboard(selectedClass, lbType)
  }, [selectedClass, lbType, fetchLeaderboard])

  const gridHeight = leaderboard.length > 0
    ? Math.min(leaderboard.length * 48 + 52, 480)
    : 100

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <Swords className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">ACADIFY ARENA</h1>
          <p className="text-sm text-muted-foreground">Monitor contest performance</p>
        </div>
      </div>

      {/* Leaderboard section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" /> Leaderboards
          </h2>
          <div className="flex items-center gap-2">
            {/* Monthly / All-Time toggle */}
            <div className="flex items-center bg-muted rounded-lg p-1 gap-1">
              <button
                type="button"
                onClick={() => setLbType("monthly")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  lbType === "monthly"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setLbType("accumulated")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  lbType === "accumulated"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All-Time
              </button>
            </div>

            {/* Class-section dropdown */}
            {classSections.length > 0 && (
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-48 h-8 text-xs">
                  <SelectValue placeholder="Select a class…" />
                </SelectTrigger>
                <SelectContent>
                  {classSections.map((cs) => (
                    <SelectItem key={`${cs.class}-${cs.section}`} value={`${cs.class}-${cs.section}`}>
                      Class {cs.class} — {cs.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Prompt if no class selected */}
        {!selectedClass ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-2xl">
            <Trophy className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Select a class to view the leaderboard.</p>
          </div>
        ) : lbLoading ? (
          <TableSkeleton rows={6} columns={4} />
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-2xl">
            <Trophy className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No results yet for this class.</p>
          </div>
        ) : (
          <div className="ag-theme-quartz w-full rounded-xl overflow-hidden" style={{ height: gridHeight }}>
            <AgGridReact
              modules={[AllCommunityModule]}
              rowData={leaderboard}
              columnDefs={colDefs}
              domLayout="normal"
              suppressCellFocus
            />
          </div>
        )}
      </div>
    </div>
  )
}
