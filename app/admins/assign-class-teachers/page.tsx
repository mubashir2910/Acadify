import { AssignClassTeachersSection } from "./components/AssignClassTeachersSection"
import AttendanceAccessSection from "./components/AttendanceAccessSection"

export default function AssignClassTeachersPage() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-6">Assign Class Teachers</h1>
        <AssignClassTeachersSection />
      </div>
      <div>
        <h2 className="text-xl font-bold mb-1">Attendance Access</h2>
        <p className="text-sm text-muted-foreground mb-5">
          When a class teacher is absent, grant a subject teacher temporary attendance-taking access.
        </p>
        <AttendanceAccessSection />
      </div>
    </div>
  )
}
