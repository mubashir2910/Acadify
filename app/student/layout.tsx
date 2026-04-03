import { DashboardShell } from "@/components/layout/dashboard-shell"

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
