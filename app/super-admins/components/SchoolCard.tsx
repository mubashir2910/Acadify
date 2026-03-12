"use client"

import Link from "next/link"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface School {
  id: string
  schoolName: string
  schoolCode: string
}

interface SchoolCardProps {
  school: School
  onImportClick: (school: School) => void
  onImportTeachersClick: (school: School) => void
  onCreateAdminClick: (school: School) => void
  onDeleteClick: (school: School) => void
}

export default function SchoolCard({ school, onImportClick, onImportTeachersClick, onCreateAdminClick, onDeleteClick }: SchoolCardProps) {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-base">{school.schoolName}</h3>
          <p className="text-sm text-muted-foreground">{school.schoolCode}</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={() => onDeleteClick(school)}
        >
          <Trash2 />
        </Button>
      </div>
      <div className="flex gap-2 mt-auto">
        <Button asChild variant="outline" size="sm">
          <Link href={`/super-admins/${school.schoolCode}/details`}>
            View Details
          </Link>
        </Button>
        <Button size="sm" onClick={() => onImportClick(school)}>
          Import Students
        </Button>
        <Button size="sm" variant="outline" onClick={() => onImportTeachersClick(school)}>
          Import Teachers
        </Button>
        <Button size="sm" variant="outline" onClick={() => onCreateAdminClick(school)}>
          Create Admin
        </Button>
      </div>
    </div>
  )
}
