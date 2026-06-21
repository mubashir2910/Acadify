"use client"

import { Logo } from '@/components/logo'
import type { UserBranding } from "@/services/school.service"
import { PanelRightClose } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"
import { SidebarNav } from "./sidebar-nav"
import { SidebarUser } from "./sidebar-user"

interface AppSidebarProps {
  basePath: string
  user: {
    name: string
    role: string
    profilePicture?: string | null
  }
  // School branding (null for super admin / on lookup failure → Acadify wordmark).
  branding?: UserBranding | null
}

function SidebarMobileClose() {
  const { setOpenMobile } = useSidebar()
  return (
    <button
      onClick={() => setOpenMobile(false)}
      className="md:hidden flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      aria-label="Close sidebar"
    >
      <PanelRightClose className="h-6 w-6" />
    </button>
  )
}

export function AppSidebar({ basePath, user, branding }: AppSidebarProps) {
  return (
    <Sidebar
      collapsible="icon"
      className="bg-sidebar/75 backdrop-blur-2xl border-r border-sidebar-border shadow-[2px_0_20px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_20px_rgba(0,0,0,0.3)]"
    >
      <SidebarHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <Logo
            logoUrl={branding?.logoUrl}
            label={branding?.schoolName}
            textClassName="group-data-[collapsible=icon]:hidden"
          />
          <SidebarMobileClose />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarNav basePath={basePath} role={user.role} />
      </SidebarContent>

      {/* Co-brand footer: keep the SaaS identity when a school logo takes the header. */}
      {branding && (
        <div className="px-3 text-[11px] font-medium text-muted-foreground group-data-[collapsible=icon]:hidden">
          Powered by ACADIFY
        </div>
      )}

      <SidebarUser user={user} basePath={basePath} />
    </Sidebar>
  )
}
