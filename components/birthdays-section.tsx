"use client"

import { useCallback, useEffect, useState, useMemo } from "react"
import { AgGridReact } from "ag-grid-react"
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community"
import type { ColDef, ICellRendererParams } from "ag-grid-community"
import { ListSkeleton } from "@/components/ui/skeletons"
import { DataErrorState } from "@/components/ui/data-error-state"
import { Cake, CalendarDays } from "lucide-react"
import type {
  BirthdayEntry,
  UpcomingBirthdayEntry,
} from "@/schemas/birthday.schema"

ModuleRegistry.registerModules([AllCommunityModule])

const BIRTHDAY_MESSAGES = [
  "Birthdays are better when celebrated together!",
  "Let's make today special for our birthday stars!",
  "Wishing our birthday heroes an amazing day!",
  "Today's celebrations belong to these wonderful people!",
  "Another year of growth, learning, and joy!",
]

function BirthdayProfilePicCell(
  params: ICellRendererParams<BirthdayEntry | UpcomingBirthdayEntry>,
) {
  const pic = params.data?.profile_picture
  const name = params.data?.name ?? "?"

  const avatar = pic ? (
    <img
      src={pic}
      alt={name}
      className="h-8 w-8 rounded-full object-cover"
    />
  ) : (
    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-medium">
      {name.charAt(0).toUpperCase()}
    </div>
  )

  return (
    <div className="flex items-center justify-center h-full">
      <div className="birthday-ring rounded-full p-[2px]">{avatar}</div>
    </div>
  )
}

function formatWhenLabel(entry: UpcomingBirthdayEntry): string {
  if (entry.days_until === 1) return `Tomorrow · ${entry.day_label}`
  return `${entry.day_label} · in ${entry.days_until} days`
}

export function BirthdaysSection() {
  const [birthdays, setBirthdays] = useState<BirthdayEntry[]>([])
  const [upcoming, setUpcoming] = useState<UpcomingBirthdayEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const message = useMemo(() => {
    const now = new Date()
    const dayOfYear = Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
    )
    return BIRTHDAY_MESSAGES[dayOfYear % BIRTHDAY_MESSAGES.length]
  }, [])

  const fetchBirthdays = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/birthdays")
      if (!res.ok) throw new Error("Failed to fetch birthdays")
      const data = await res.json()
      setBirthdays(data.birthdays ?? [])
      setUpcoming(data.upcoming ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBirthdays()
  }, [fetchBirthdays])

  const todayColDefs = useMemo<ColDef<BirthdayEntry>[]>(
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
    [],
  )

  const upcomingColDefs = useMemo<ColDef<UpcomingBirthdayEntry>[]>(
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
      {
        headerName: "When",
        flex: 1.4,
        minWidth: 160,
        valueGetter: (p) => (p.data ? formatWhenLabel(p.data) : ""),
        cellRenderer: (
          params: ICellRendererParams<UpcomingBirthdayEntry>,
        ) => {
          if (!params.data) return null
          return (
            <span className="text-amber-700 dark:text-amber-400 font-medium">
              {formatWhenLabel(params.data)}
            </span>
          )
        },
      },
    ],
    [],
  )

  if (loading) return <ListSkeleton items={5} />
  if (error)
    return (
      <DataErrorState
        title="Couldn't load birthdays"
        description="Something went wrong on our side."
        onRetry={fetchBirthdays}
      />
    )

  return (
    <div className="space-y-8">
      {/* ── Today ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg bg-amber-500/10 border border-amber-200 p-4">
          <Cake className="h-6 w-6 text-amber-500 shrink-0" />
          <p className="text-amber-700 dark:text-amber-400 font-medium">{message}</p>
        </div>

        {birthdays.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Cake className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>No birthdays today</p>
          </div>
        ) : (
          <div className="ag-theme-quartz">
            <AgGridReact
              rowData={birthdays}
              columnDefs={todayColDefs}
              rowHeight={52}
              domLayout="autoHeight"
              suppressCellFocus
            />
          </div>
        )}
      </section>

      {/* ── Upcoming this week (Mon–Sun, excludes today) ───── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">
            Upcoming Birthdays This Week
          </h2>
        </div>

        {upcoming.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/50/60 text-center py-8 text-sm text-muted-foreground">
            No upcoming birthdays this week.
          </div>
        ) : (
          <div className="ag-theme-quartz">
            <AgGridReact
              rowData={upcoming}
              columnDefs={upcomingColDefs}
              rowHeight={52}
              domLayout="autoHeight"
              suppressCellFocus
            />
          </div>
        )}
      </section>
    </div>
  )
}
