import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
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

  // Pull the profile picture server-side so the sidebar avatar reflects the
  // latest uploaded image without needing a JWT refresh (would force re-login).
  let profilePicture: string | null = null
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { profile_picture: true },
    })
    profilePicture = user?.profile_picture ?? null
  }

  return (
    <SidebarProvider>
      <AppSidebar
        basePath={basePath}
        user={{ name, role, profilePicture }}
      />
      <SidebarInset className="bg-muted/40 dark:bg-background min-h-screen">
        {/* Mobile top header: logo left, sidebar trigger right */}
        <MobileHeader />
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
