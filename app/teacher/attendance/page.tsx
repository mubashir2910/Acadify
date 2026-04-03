import TeacherSelfAttendanceSection from "./components/TeacherSelfAttendanceSection"

export default function TeacherAttendancePage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">My Attendance</h1>
      <TeacherSelfAttendanceSection />
    </div>
  )
}
