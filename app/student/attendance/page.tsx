import StudentAttendanceSection from "./components/StudentAttendanceSection"

export default function StudentAttendancePage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">My Attendance</h1>
      <StudentAttendanceSection />
    </div>
  )
}
