"use client"

import { useCallback, useEffect, useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import TimetableGridView from "@/components/timetable-grid-view"
import TimetableEditSection from "./TimetableEditSection"
import type { TimetableGrid, PeriodRow } from "@/schemas/timetable.schema"

export default function AdminTimetableSection() {
  const [periods, setPeriods] = useState<PeriodRow[]>([])
  const [grid, setGrid] = useState<TimetableGrid | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [periodsRes, gridRes] = await Promise.all([
        fetch("/api/timetable/periods"),
        fetch("/api/timetable"),
      ])
      if (!periodsRes.ok || !gridRes.ok) throw new Error()
      const [periodsData, gridData] = await Promise.all([periodsRes.json(), gridRes.json()])
      setPeriods(periodsData)
      setGrid(gridData)
    } catch {
      setError("Could not load timetable data. Please refresh.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Timetable</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage and view the school schedule</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-64 rounded-lg" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : (
        <Tabs defaultValue="routine">
          <TabsList>
            <TabsTrigger value="routine">Routine</TabsTrigger>
            <TabsTrigger value="edit">Edit</TabsTrigger>
          </TabsList>

          <TabsContent value="routine" className="mt-4">
            {grid ? (
              <TimetableGridView grid={grid} />
            ) : (
              <p className="text-sm text-muted-foreground">No timetable data yet.</p>
            )}
          </TabsContent>

          <TabsContent value="edit" className="mt-4">
            <TimetableEditSection
              periods={periods}
              grid={grid ?? { periods: [], rows: [] }}
              onRefresh={fetchData}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
