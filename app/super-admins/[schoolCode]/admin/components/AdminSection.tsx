"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AgGridReact } from "ag-grid-react"
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community"
import type { ColDef, ValueGetterParams } from "ag-grid-community"
import { Button } from "@/components/ui/button"
import CreateAdminModal from "../../../components/CreateAdminModal"
import type { School } from "../../../components/SchoolCard"

ModuleRegistry.registerModules([AllCommunityModule])

interface Admin {
  id: string
  name: string
  username: string
  is_active: boolean
  must_reset_password: boolean
  created_at: string
}

interface AdminSectionProps {
  schoolCode: string
}

export default function AdminSection({ schoolCode }: AdminSectionProps) {
  const [admins, setAdmins] = useState<Admin[] | undefined>(undefined) // undefined = loading
  const [createAdminOpen, setCreateAdminOpen] = useState(false)
  const [school, setSchool] = useState<School | null>(null)

  const fetchAdmins = useCallback(async () => {
    const [adminRes, schoolRes] = await Promise.all([
      fetch(`/api/schools/${schoolCode}/admins`),
      fetch(`/api/schools/${schoolCode}`),
    ])
    if (adminRes.ok) setAdmins(await adminRes.json())
    if (schoolRes.ok) setSchool(await schoolRes.json())
  }, [schoolCode])

  useEffect(() => {
    fetchAdmins()
  }, [fetchAdmins])

  const colDefs = useMemo<ColDef<Admin>[]>(
    () => [
      {
        headerName: "Name",
        field: "name",
        flex: 2,
        minWidth: 150,
      },
      {
        headerName: "Username",
        field: "username",
        flex: 1,
        minWidth: 130,
        cellClass: "font-mono text-xs",
      },
      {
        headerName: "Active",
        flex: 1,
        minWidth: 90,
        valueGetter: (p: ValueGetterParams<Admin>) =>
          p.data?.is_active ? "Yes" : "No",
      },
      {
        headerName: "Must Reset",
        flex: 1,
        minWidth: 110,
        valueGetter: (p: ValueGetterParams<Admin>) =>
          p.data?.must_reset_password ? "Yes" : "No",
      },
      {
        headerName: "Created",
        flex: 1,
        minWidth: 110,
        valueGetter: (p: ValueGetterParams<Admin>) =>
          new Date(p.data!.created_at).toLocaleDateString(),
      },
    ],
    []
  )

  if (admins === undefined) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Admin Accounts</h2>
        <Button size="sm" onClick={() => setCreateAdminOpen(true)}>
          Create Admin
        </Button>
      </div>

      {admins.length > 0 ? (
        <div
          className="ag-theme-quartz"
          style={{ height: admins.length * 46 + 50 }}
        >
          <AgGridReact
            rowData={admins}
            columnDefs={colDefs}
            rowHeight={46}
            suppressMovableColumns
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No admins assigned yet for this school.
        </p>
      )}

      {createAdminOpen && school && (
        <CreateAdminModal
          school={school}
          onClose={() => {
            setCreateAdminOpen(false)
            fetchAdmins()
          }}
        />
      )}
    </div>
  )
}
