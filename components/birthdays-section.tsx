"use client"

import { useEffect, useState, useMemo } from "react"
import { AgGridReact } from "ag-grid-react"
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community"
import type { ColDef, ICellRendererParams } from "ag-grid-community"
import { Skeleton } from "@/components/ui/skeleton"
import { Cake } from "lucide-react"
import type { BirthdayEntry } from "@/schemas/birthday.schema"

ModuleRegistry.registerModules([AllCommunityModule])

const BIRTHDAY_MESSAGES = [
  "Birthdays are better when celebrated together!",
  "Let's make today special for our birthday stars!",
  "Wishing our birthday heroes an amazing day!",
  "Today's celebrations belong to these wonderful people!",
  "Another year of growth, learning, and joy!",
]

function BirthdayProfilePicCell(params: ICellRendererParams<BirthdayEntry>) {
  const pic = params.data?.profile_picture
  const name = params.data?.name ?? "?"

  const avatar = pic ? (
    <img
      src={pic}
      alt={name}
      className="h-8 w-8 rounded-full object-cover"
    />
  ) : (
    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-medium">
      {name.charAt(0).toUpperCase()}
    </div>
  )

  return (
    <div className="flex items-center justify-center h-full">
      <div className="birthday-ring rounded-full p-[2px]">{avatar}</div>
    </div>
  )
}

export function BirthdaysSection() {
  const [birthdays, setBirthdays] = useState<BirthdayEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const message = useMemo(() => {
    const now = new Date()
    const dayOfYear = Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
    )
    return BIRTHDAY_MESSAGES[dayOfYear % BIRTHDAY_MESSAGES.length]
  }, [])

  useEffect(() => {
    async function fetchBirthdays() {
      try {
        const res = await fetch("/api/birthdays")
        if (!res.ok) throw new Error("Failed to fetch birthdays")
        const data = await res.json()
        setBirthdays(data.birthdays)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch")
      } finally {
        setLoading(false)
      }
    }
    fetchBirthdays()
  }, [])

  const colDefs = useMemo<ColDef<BirthdayEntry>[]>(
    () => [
      {
        headerName: "",
        width: 60,
        sortable: false,
        filter: false,
        cellRenderer: BirthdayProfilePicCell,
      },
      {
        headerName: "Name",
        field: "name",
        flex: 2,
        minWidth: 160,
      },
      {
        headerName: "Class",
        flex: 1,
        minWidth: 80,
        valueGetter: (p) => p.data?.class ?? "—",
      },
      {
        headerName: "Section",
        flex: 1,
        minWidth: 80,
        valueGetter: (p) => p.data?.section ?? "—",
      },
    ],
    []
  )

  if (loading) return <Skeleton className="h-64 w-full rounded-lg" />
  if (error) return <p className="text-red-500">{error}</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 p-4">
        <Cake className="h-6 w-6 text-amber-500 shrink-0" />
        <p className="text-amber-800 font-medium">{message}</p>
      </div>

      {birthdays.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Cake className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No birthdays today</p>
        </div>
      ) : (
        <div className="ag-theme-quartz">
          <AgGridReact
            rowData={birthdays}
            columnDefs={colDefs}
            domLayout="autoHeight"
            suppressCellFocus
          />
        </div>
      )}
    </div>
  )
}
