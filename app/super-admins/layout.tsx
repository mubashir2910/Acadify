import { DashboardShell } from "@/components/layout/dashboard-shell"

export default function SuperAdminsLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
