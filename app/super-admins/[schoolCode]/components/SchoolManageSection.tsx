"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import ImportStudentsModal from "../../components/ImportStudentsModal"
import ImportTeachersModal from "../../components/ImportTeachersModal"
import type { School } from "../../components/SchoolCard"

interface SchoolManageSectionProps {
  schoolCode: string
}

export default function SchoolManageSection({ schoolCode }: SchoolManageSectionProps) {
  const router = useRouter()
  const [school, setSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)
  const [importStudentsOpen, setImportStudentsOpen] = useState(false)
  const [importTeachersOpen, setImportTeachersOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchSchool = useCallback(async () => {
    const res = await fetch(`/api/schools/${schoolCode}`)
    if (res.ok) {
      setSchool(await res.json())
    }
    setLoading(false)
  }, [schoolCode])

  useEffect(() => {
    fetchSchool()
  }, [fetchSchool])

  async function handleDelete() {
    if (!school) return
    if (!confirm(`Delete "${school.schoolName}"? This cannot be undone.`)) return
    setDeleting(true)
    const res = await fetch(`/api/schools/${schoolCode}`, { method: "DELETE" })
    if (res.ok) {
      router.push("/super-admins")
    } else {
      setDeleting(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  if (!school) {
    return <p className="text-sm text-destructive">School not found.</p>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/super-admins">← Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{school.schoolName}</h1>
          <p className="text-sm text-muted-foreground font-mono">{school.schoolCode}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button size="sm" onClick={() => setImportStudentsOpen(true)}>
          Import Students
        </Button>
        <Button size="sm" variant="outline" onClick={() => setImportTeachersOpen(true)}>
          Import Teachers
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/super-admins/${schoolCode}/details`}>Student Details</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/super-admins/${schoolCode}/teachers`}>Teacher Details</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/super-admins/${schoolCode}/admin`}>Admin Details</Link>
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? "Deleting..." : "Delete School"}
        </Button>
      </div>

      {/* Modals */}
      {importStudentsOpen && (
        <ImportStudentsModal
          school={school}
          onClose={() => setImportStudentsOpen(false)}
        />
      )}
      {importTeachersOpen && (
        <ImportTeachersModal
          school={school}
          onClose={() => setImportTeachersOpen(false)}
        />
      )}
    </div>
  )
}
