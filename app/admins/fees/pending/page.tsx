import PendingVerificationsTab from "../components/PendingVerificationsTab"

export default function AdminPendingVerificationsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Pending Verifications</h1>
      <PendingVerificationsTab />
    </div>
  )
}
