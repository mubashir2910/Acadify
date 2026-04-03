"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Users, Percent } from "lucide-react"

interface AdminQuickStatsProps {
  totalStudents: number
  attendanceRate: number
}

export default function AdminQuickStats({ totalStudents, attendanceRate }: AdminQuickStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="bg-slate-50 border-0 shadow-none">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-slate-600" />
            <span className="text-xs font-medium text-muted-foreground">Total Students</span>
          </div>
          <p className="text-2xl font-bold text-slate-700">{totalStudents}</p>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-0 shadow-none">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-muted-foreground">Today&apos;s Attendance Rate</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{attendanceRate}%</p>
        </CardContent>
      </Card>
    </div>
  )
}
