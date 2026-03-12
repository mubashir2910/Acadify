"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { CreateSchoolForm } from "@/components/forms/create-school-form"
import SchoolsTable from "./SchoolsTable"
import type { School } from "./SchoolCard"

export default function SchoolsSection() {
  const [showForm, setShowForm] = useState(false)
  const [schools, setSchools] = useState<School[]>([])

  const fetchSchools = useCallback(async () => {
    const res = await fetch("/api/schools")
    if (res.ok) {
      const data = await res.json()
      setSchools(data)
    }
  }, [])

  useEffect(() => {
    fetchSchools()
  }, [fetchSchools])

  function handleSuccess() {
    setShowForm(false)
    fetchSchools()
  }

  return (
    <div className="space-y-6">
      <Button onClick={() => setShowForm((prev) => !prev)}>
        {showForm ? "Cancel" : "Add School"}
      </Button>

      {showForm && <CreateSchoolForm onSuccess={handleSuccess} />}

      <div>
        <h2 className="text-lg font-semibold mb-4">Schools</h2>
        {schools.length === 0 ? (
          <p className="text-sm text-muted-foreground">No schools found.</p>
        ) : (
          <SchoolsTable schools={schools} />
        )}
      </div>
    </div>
  )
}
