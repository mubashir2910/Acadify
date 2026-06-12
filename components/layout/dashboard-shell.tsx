import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getDashboardPath } from "@/lib/auth-redirect"
import { getBrandingForUser, type UserBranding } from "@/services/school.service"
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
  // Co-brand the dashboard with the user's school (null for super admin / on failure).
  let profilePicture: string | null = null
  let branding: UserBranding | null = null
  if (session?.user?.id) {
    const [user, userBranding] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { profile_picture: true },
      }),
      getBrandingForUser(session.user.id, role),
    ])
    profilePicture = user?.profile_picture ?? null
    branding = userBranding
  }

  return (
    <SidebarProvider>
      <AppSidebar
        basePath={basePath}
        user={{ name, role, profilePicture }}
        branding={branding}
      />
      <SidebarInset className="bg-muted/40 dark:bg-background min-h-screen">
        {/* Mobile top header: logo left, sidebar trigger right */}
        <MobileHeader branding={branding} />
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
