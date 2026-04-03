"use client"

import { useEffect, useState, useMemo } from "react"
import { AgGridReact } from "ag-grid-react"
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community"
import type { ColDef } from "ag-grid-community"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { ProfilePicCell } from "@/components/ui/profile-pic-cell"
import { toast } from "sonner"
import { Search, KeyRound } from "lucide-react"
import ResetPasswordModal from "@/app/admins/components/ResetPasswordModal"

ModuleRegistry.registerModules([AllCommunityModule])

interface StudentRow {
  roll_no: string
  class: string
  section: string
  guardian_phone?: string
  user: {
    id: string
    username: string
    name: string
    phone: string | null
    profile_picture: string | null
  }
}

function WhatsAppCell({ data }: { data?: StudentRow }) {
  function handleClick() {
    const raw = data?.user.phone || data?.guardian_phone
    const cleaned = raw ? raw.replace(/\D/g, "") : ""

    if (!cleaned || cleaned.length < 7) {
      toast.error("WhatsApp number not provided")
      return
    }

    window.open(`https://wa.me/${cleaned}`, "_blank", "noopener,noreferrer")
  }

  const displayPhone = data?.user.phone || data?.guardian_phone

  return (
    <div className="flex items-center justify-center h-full">
      <button
        onClick={handleClick}
        title={displayPhone ? `WhatsApp: ${displayPhone}` : "No WhatsApp number"}
        className="rounded-full p-1 hover:bg-green-50 transition-colors"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#25D366">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      </button>
    </div>
  )
}

export function AdminStudentsSection() {
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchText, setSearchText] = useState("")
  const [resetTarget, setResetTarget] = useState<{ userId: string; name: string } | null>(null)

  useEffect(() => {
    async function fetchStudents() {
      try {
        const res = await fetch("/api/students")
        if (!res.ok) throw new Error("Failed to fetch students")
        setStudents(await res.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch")
      } finally {
        setLoading(false)
      }
    }
    fetchStudents()
  }, [])

  const colDefs = useMemo<ColDef<StudentRow>[]>(
    () => [
      {
        headerName: "",
        width: 60,
        sortable: false,
        filter: false,
        cellRenderer: ProfilePicCell,
      },
      {
        headerName: "Student ID",
        flex: 1,
        minWidth: 130,
        cellClass: "font-mono text-xs",
        valueGetter: (p) => p.data?.user.username,
      },
      {
        headerName: "Name",
        flex: 2,
        minWidth: 160,
        valueGetter: (p) => p.data?.user.name,
      },
      {
        headerName: "Phone",
        flex: 1,
        minWidth: 120,
        valueGetter: (p) => p.data?.user.phone || p.data?.guardian_phone || "—",
      },
      {
        headerName: "Class",
        field: "class",
        flex: 1,
        minWidth: 80,
      },
      {
        headerName: "Section",
        field: "section",
        flex: 1,
        minWidth: 80,
      },
      {
        headerName: "Roll No",
        field: "roll_no",
        flex: 1,
        minWidth: 90,
      },
      {
        headerName: "WhatsApp",
        width: 90,
        sortable: false,
        filter: false,
        cellRenderer: WhatsAppCell,
      },
      {
        headerName: "Password",
        width: 100,
        sortable: false,
        filter: false,
        cellRenderer: ({ data }: { data?: StudentRow }) => (
          <div className="flex items-center justify-center h-full">
            <button
              onClick={() =>
                data && setResetTarget({ userId: data.user.id, name: data.user.name })
              }
              title="Reset password"
              className="rounded-full p-1 hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700"
            >
              <KeyRound className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [setResetTarget]
  )

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />
  if (error) return <p className="text-sm text-destructive">{error}</p>

  if (students.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">No students found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search students..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="pl-8"
        />
      </div>
      <div className="ag-theme-quartz" style={{ height: "calc(100vh - 260px)", minHeight: 400 }}>
        <AgGridReact
          rowData={students}
          columnDefs={colDefs}
          rowHeight={46}
          pagination
          paginationPageSize={50}
          quickFilterText={searchText}
        />
      </div>
      <ResetPasswordModal
        open={!!resetTarget}
        onOpenChange={(open) => { if (!open) setResetTarget(null) }}
        userName={resetTarget?.name ?? ""}
        userId={resetTarget?.userId ?? ""}
      />
    </div>
  )
}
