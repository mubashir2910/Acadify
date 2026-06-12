"use client"

import { useCallback, useEffect, useState } from "react"
import { AgGridReact } from "ag-grid-react"
import { AllCommunityModule } from "ag-grid-community"
import type { ColDef } from "ag-grid-community"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Trophy } from "lucide-react"

interface LeaderboardEntry {
  rank: number
  name: string
  score: number
  totalMarks: number
  submittedAt: string | null
}

interface QuizLeaderboardProps {
  quizId: string
}

export function QuizLeaderboard({ quizId }: QuizLeaderboardProps) {
  const [data, setData] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/quiz/${quizId}/leaderboard`)
      const json = await res.json()
      setData(Array.isArray(json) ? json : [])
    } finally {
      setLoading(false)
    }
  }, [quizId])

  useEffect(() => { fetch_() }, [fetch_])

  const columnDefs: ColDef<LeaderboardEntry>[] = [
    {
      headerName: "Rank",
      field: "rank",
      width: 80,
      cellRenderer: ({ value }: { value: number }) => {
        if (value === 1) return <span className="text-yellow-500 font-bold">🥇 1</span>
        if (value === 2) return <span className="text-muted-foreground font-bold">🥈 2</span>
        if (value === 3) return <span className="text-amber-600 dark:text-amber-400 font-bold">🥉 3</span>
        return <span className="text-muted-foreground">{value}</span>
      },
    },
    { headerName: "Student", field: "name", flex: 1, minWidth: 140 },
    {
      headerName: "Score",
      flex: 1,
      cellRenderer: ({ data: d }: { data: LeaderboardEntry }) => (
        <Badge variant="outline" className="font-semibold">
          {d.score} / {d.totalMarks}
        </Badge>
      ),
    },
    {
      headerName: "Submitted At",
      field: "submittedAt",
      width: 170,
      valueFormatter: ({ value }) =>
        value
          ? new Date(value).toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—",
    },
  ]

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Trophy className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>No submissions yet.</p>
      </div>
    )
  }

  return (
    <div className="ag-theme-quartz w-full" style={{ height: 400 }}>
      <AgGridReact
        modules={[AllCommunityModule]}
        rowData={data}
        columnDefs={columnDefs}
        pagination
        paginationPageSize={25}
      />
    </div>
  )
}
