"use client"

import Image from "next/image"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Logo } from "../logo"

export function MobileHeader() {
  return (
    <header className="flex items-center justify-between px-4 h-16 border-b border-white/40 bg-white/80 backdrop-blur-md sticky top-0 z-10 md:hidden">
      {/* Logo + name — left side */}
      <div className="flex items-center gap-2.5">
        <Logo />
      </div>

      {/* Sidebar trigger — right side, larger icon */}
      <SidebarTrigger className="[&_svg]:h-7 [&_svg]:w-7 h-10 w-10" />
    </header>
  )
}
