import { auth } from "@/auth"
import { getDashboardPath } from "@/lib/auth-redirect"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "./app-sidebar"
import { MobileHeader } from "./mobile-header"

interface DashboardShellProps {
  children: React.ReactNode
}

export async function DashboardShell({ children }: DashboardShellProps) {
  const session = await auth()

  const role = session?.user?.role ?? "STUDENT"
  const name = session?.user?.name ?? "User"
  const basePath = getDashboardPath(role)

  return (
    <SidebarProvider>
      <AppSidebar basePath={basePath} user={{ name, role }} />
      <SidebarInset className="bg-slate-50 min-h-screen">
        {/* Mobile top header: logo left, sidebar trigger right */}
        <MobileHeader />
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
