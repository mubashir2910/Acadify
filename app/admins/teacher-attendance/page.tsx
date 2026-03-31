import MarkTeacherAttendanceSection from "./components/MarkTeacherAttendanceSection"

export default function TeacherAttendancePage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Teacher Attendance</h1>
      <MarkTeacherAttendanceSection />
    </div>
  )
}
