import TeacherAttendanceSection from "../attendance/components/TeacherAttendanceSection"

export default function ClassAttendancePage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Class Attendance</h1>
      <TeacherAttendanceSection />
    </div>
  )
}
