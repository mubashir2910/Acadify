import AdminAttendanceSection from "./components/AdminAttendanceSection"

export default function AdminAttendancePage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Student Attendance Overview</h1>
      <AdminAttendanceSection />
    </div>
  )
}
