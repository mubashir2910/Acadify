"use client"

import Link from "next/link"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface School {
  id: string
  schoolName: string
  schoolCode: string
  subscription_status?: string
  trial_ends_at?: string | null
  subscription_ends_at?: string | null
  session_started_on?: string | null
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
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base">{school.schoolName}</h3>
            <SubscriptionBadge status={school.subscription_status} />
          </div>
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
        <Button asChild size="sm" variant="outline">
          <Link href={`/super-admins/${school.schoolCode}`}>Manage</Link>
        </Button>
      </div>
    </div>
  )
}

const STATUS_STYLES: Record<string, string> = {
  TRIAL: "bg-yellow-100 text-yellow-800",
  ACTIVE: "bg-green-100 text-green-800",
  SUSPENDED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-600",
}

function SubscriptionBadge({ status }: { status?: string }) {
  if (!status) return null
  const style = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600"
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${style}`}>
      {status}
    </span>
  )
}
