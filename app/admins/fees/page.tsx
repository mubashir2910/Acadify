import AdminFeesSection from "./components/AdminFeesSection"

export default function AdminFeesPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Fees Management</h1>
      <AdminFeesSection />
    </div>
  )
}
