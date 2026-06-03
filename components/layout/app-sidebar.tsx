"use client"

import Image from "next/image"
import { Logo } from '@/components/logo'
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

export function AppSidebar({ basePath, user }: AppSidebarProps) {
  return (
    <Sidebar
      collapsible="icon"
      className="bg-sidebar/75 backdrop-blur-2xl border-r border-sidebar-border shadow-[2px_0_20px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_20px_rgba(0,0,0,0.3)]"
    >
      <SidebarHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          {/* <div className="flex items-center gap-2.5 pl-1">
            <Image
              src="/acadify.png"
              alt="Acadify"
              width={36}
              height={36}
              className="h-9 w-9 shrink-0"
              priority
            />
            <span className="text-[15px] font-semibold group-data-[collapsible=icon]:hidden">
              Acadify
            </span>
          </div> */}
          <Logo />
          <SidebarMobileClose />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarNav basePath={basePath} role={user.role} />
      </SidebarContent>

      <SidebarUser user={user} basePath={basePath} />
    </Sidebar>
  )
}
