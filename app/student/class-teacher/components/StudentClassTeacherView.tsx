"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { UserRound } from "lucide-react"

interface ClassTeacherData {
  class: string
  section: string
  teacherName: string | null
}

export function StudentClassTeacherView() {
  const [data, setData] = useState<ClassTeacherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/class-teachers/my-teacher")
        if (!res.ok) throw new Error("Failed to fetch class teacher")
        setData(await res.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <Skeleton className="h-40 w-full rounded-xl" />
  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!data) return null

  return (
    <div className="rounded-lg border bg-slate-50 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
          <UserRound className="h-5 w-5 text-slate-500" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Your Class Teacher</p>
          <p className="text-lg font-semibold">
            {data.teacherName ?? "Not assigned"}
          </p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Class {data.class} — Section {data.section}
      </p>
    </div>
  )
}
