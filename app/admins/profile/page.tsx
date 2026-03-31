import { AdminProfileView } from "./components/AdminProfileView"

export default function AdminProfilePage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>
      <AdminProfileView />
    </div>
  )
}
