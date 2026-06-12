"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import type { UserBranding } from "@/services/school.service"
import { Logo } from "../logo"

interface MobileHeaderProps {
  // School branding (null for super admin / on lookup failure → Acadify wordmark).
  branding?: UserBranding | null
}

export function MobileHeader({ branding }: MobileHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10 md:hidden">
      {/* Logo + name — left side */}
      <div className="flex items-center gap-2.5">
        <Logo logoUrl={branding?.logoUrl} label={branding?.schoolName} />
      </div>

      {/* Sidebar trigger — right side, larger icon */}
      <SidebarTrigger className="[&_svg]:h-7 [&_svg]:w-7 h-10 w-10" />
    </header>
  )
}
