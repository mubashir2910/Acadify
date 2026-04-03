import { NotificationsSection } from "@/components/notifications/NotificationsSection"

export default function TeacherNotificationsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Notifications</h1>
      <NotificationsSection />
    </div>
  )
}
