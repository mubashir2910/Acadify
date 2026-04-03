import { AdminStudentsSection } from "./components/AdminStudentsSection"

export default function AdminStudentsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Students</h1>
      <AdminStudentsSection />
    </div>
  )
}
