"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import AttendanceCalendarView from "@/app/student/attendance/components/AttendanceCalendarView"

export default function StudentCalendarPreview() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Attendance Calendar</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <AttendanceCalendarView />
      </CardContent>
    </Card>
  )
}
