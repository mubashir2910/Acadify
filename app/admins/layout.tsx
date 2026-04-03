import { DashboardShell } from "@/components/layout/dashboard-shell"

export default function AdminsLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
