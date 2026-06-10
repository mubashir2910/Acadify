"use client"

import { Card, CardContent } from "@/components/ui/card"
import { BookOpen } from "lucide-react"

interface TeacherClassInfoProps {
  assigned: boolean
  className?: string
  section?: string
}

export default function TeacherClassInfo({ assigned, className, section }: TeacherClassInfoProps) {
  if (!assigned) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center text-muted-foreground">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No class assigned yet. Contact your administrator.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-blue-500/10 border-0 shadow-none">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/10 rounded-lg p-2">
            <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Your Class</p>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-400">
              Class {className} — Section {section}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
