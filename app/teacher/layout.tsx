import { DashboardShell } from "@/components/layout/dashboard-shell"

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
