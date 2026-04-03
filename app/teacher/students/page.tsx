import { TeacherStudentsSection } from "./components/TeacherStudentsSection"

export default function TeacherStudentsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Students</h1>
      <TeacherStudentsSection />
    </div>
  )
}
