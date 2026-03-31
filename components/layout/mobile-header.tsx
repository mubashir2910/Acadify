"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"

export function MobileHeader() {
  return (
    <header className="flex items-center justify-between px-4 h-16 border-b border-white/40 bg-white/80 backdrop-blur-md sticky top-0 z-10 md:hidden">
      {/* School logo + name — left side */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1e2a4a] text-white text-[13px] font-bold">
          A
        </div>
        <span className="text-[15px] font-semibold">Acadify</span>
      </div>

      {/* Sidebar trigger — right side, larger icon */}
      <SidebarTrigger className="[&_svg]:h-5 [&_svg]:w-5 h-10 w-10" />
    </header>
  )
}
