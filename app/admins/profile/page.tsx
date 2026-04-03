import { AdminProfileView } from "./components/AdminProfileView"

export default function AdminProfilePage() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>
      <AdminProfileView />
    </div>
  )
}
