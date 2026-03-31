import SchoolCalendarView from "@/components/school-calendar-view"

export default function StudentCalendarPage() {
  return (
    <div className="p-2 md:p-6 space-y-4">
      <h1 className="text-xl font-semibold">School Calendar</h1>
      <SchoolCalendarView />
    </div>
  )
}
