"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { useTheme } from "next-themes"
import { LogOut, Monitor, Moon, Palette, Sun, User } from "lucide-react"
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
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SidebarUserProps {
  user: {
    name: string
    role: string
    profilePicture?: string | null
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
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Pre-mount: render Palette icon to keep markup stable across SSR/CSR
  const ThemeIcon = !mounted
    ? Palette
    : theme === "dark"
      ? Moon
      : theme === "light"
        ? Sun
        : Monitor

  return (
    <SidebarFooter className="border-t border-border pt-2 mt-2">
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-accent"
              >
                {/* Avatar — picture if uploaded, initials otherwise */}
                {user.profilePicture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.profilePicture}
                    alt={user.name}
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    {getInitials(user.name)}
                  </div>
                )}
                <div className="flex flex-col gap-0 leading-none overflow-hidden">
                  <span className="text-[13px] font-medium truncate text-foreground">
                    {user.name}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground truncate">
                    {user.role}
                  </span>
                </div>
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent side="top" align="start" className="w-56 rounded-xl shadow-lg">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-[13px]">{user.name}</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-normal">
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
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer">
                  <ThemeIcon className="mr-2 h-4 w-4" />
                  Theme
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="rounded-xl shadow-lg">
                    <DropdownMenuRadioGroup
                      value={mounted ? (theme ?? "system") : "system"}
                      onValueChange={setTheme}
                    >
                      <DropdownMenuRadioItem value="light" className="cursor-pointer">
                        <Sun className="mr-2 h-4 w-4" />
                        Light
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="dark" className="cursor-pointer">
                        <Moon className="mr-2 h-4 w-4" />
                        Dark
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="system" className="cursor-pointer">
                        <Monitor className="mr-2 h-4 w-4" />
                        System
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
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
