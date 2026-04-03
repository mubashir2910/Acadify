import AdminCalendarSection from "./components/AdminCalendarSection"

export default function AdminCalendarPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">School Calendar</h1>
      <AdminCalendarSection />
    </div>
  )
}
