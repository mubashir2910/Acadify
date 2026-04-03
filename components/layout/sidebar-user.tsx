"use client"

import Link from "next/link"
import { signOut } from "next-auth/react"
import { LogOut, User } from "lucide-react"
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SidebarUserProps {
  user: {
    name: string
    role: string
  }
  basePath: string
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}


export function SidebarUser({ user, basePath }: SidebarUserProps) {
  return (
    <SidebarFooter className="border-t border-slate-100 pt-2 mt-2">
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-slate-50"
              >
                {/* Avatar */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1e2a4a] text-white text-xs font-semibold">
                  {getInitials(user.name)}
                </div>
                <div className="flex flex-col gap-0 leading-none overflow-hidden">
                  <span className="text-[13px] font-medium truncate text-slate-800">
                    {user.name}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 truncate">
                    {user.role}
                  </span>
                </div>
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent side="top" align="start" className="w-56 rounded-xl shadow-lg">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-[13px]">{user.name}</span>
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-normal">
                    {user.role}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`${basePath}/profile`} className="w-full cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  )
}
