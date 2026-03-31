import { StudentProfileView } from "./components/StudentProfileView"

export default function StudentProfilePage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>
      <StudentProfileView />
    </div>
  )
}
