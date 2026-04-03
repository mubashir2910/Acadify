import { StudentClassTeacherView } from "./components/StudentClassTeacherView"

export default function StudentClassTeacherPage() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Class Management</h1>
      <StudentClassTeacherView />
    </div>
  )
}

