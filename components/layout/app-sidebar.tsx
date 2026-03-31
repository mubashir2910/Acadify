"use client"

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
  }
}

function SidebarMobileClose() {
  const { setOpenMobile } = useSidebar()
  return (
    <button
      onClick={() => setOpenMobile(false)}
      className="md:hidden flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
      aria-label="Close sidebar"
    >
      <PanelRightClose className="h-5 w-5" />
    </button>
  )
}

export function AppSidebar({ basePath, user }: AppSidebarProps) {
  return (
    <Sidebar
      collapsible="icon"
      className="bg-white/75 backdrop-blur-2xl border-r border-white/40 shadow-[2px_0_20px_rgba(0,0,0,0.06)]"
    >
      <SidebarHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 pl-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1e2a4a] text-white text-[15px] font-bold">
              A
            </div>
            <span className="text-[15px] font-semibold group-data-[collapsible=icon]:hidden">
              Acadify
            </span>
          </div>
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
