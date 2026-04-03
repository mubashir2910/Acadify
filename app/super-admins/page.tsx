import AddSchool from "./components/AddSchool"
import DashboardAnalytics from "./components/DashboardAnalytics"

export default function SuperAdminsPage() {
  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Super Admin</h1>
      <DashboardAnalytics />
      <AddSchool />
    </div>
  )
}
