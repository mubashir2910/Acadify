"use client"

import { useCallback, useEffect, useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import TimetableGridView from "@/components/timetable-grid-view"
import MyRoutineView from "./MyRoutineView"
import type { TimetableGrid } from "@/schemas/timetable.schema"

export default function TeacherTimetableSection() {
  const [grid, setGrid] = useState<TimetableGrid | null>(null)
  const [othersLoaded, setOthersLoaded] = useState(false)
  const [othersLoading, setOthersLoading] = useState(false)
  const [othersError, setOthersError] = useState(false)

  const fetchOthers = useCallback(async () => {
    if (othersLoaded) return
    setOthersLoading(true)
    setOthersError(false)
    try {
      const res = await fetch("/api/timetable")
      if (!res.ok) throw new Error()
      setGrid(await res.json())
      setOthersLoaded(true)
    } catch {
      setOthersError(true)
    } finally {
      setOthersLoading(false)
    }
  }, [othersLoaded])

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Timetable</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your schedule and the full school timetable</p>
      </div>

      <Tabs defaultValue="my">
        <TabsList>
          <TabsTrigger value="my">My Routine</TabsTrigger>
          <TabsTrigger value="others" onClick={fetchOthers}>Others</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="mt-4">
          <MyRoutineView />
        </TabsContent>

        <TabsContent value="others" className="mt-4">
          {othersLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-48 rounded-lg" />
              <Skeleton className="h-56 rounded-xl" />
            </div>
          ) : othersError ? (
            <p className="text-sm text-red-500">Could not load timetable. Please try again.</p>
          ) : grid ? (
            <TimetableGridView grid={grid} />
          ) : (
            <p className="text-sm text-muted-foreground">Click the Others tab to load the full timetable.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
