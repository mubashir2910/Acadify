import TeacherAttendanceOverviewSection from "./components/TeacherAttendanceOverviewSection"

export default function TeacherAttendanceOverviewPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Teacher Attendance Overview</h1>
      <TeacherAttendanceOverviewSection />
    </div>
  )
}
