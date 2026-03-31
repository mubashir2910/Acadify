"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, CalendarCheck, CalendarDays, BookOpen, UserRound, Users, GraduationCap, Cake, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

const NAV_ITEMS = [
  { label: "Overview", icon: LayoutDashboard, slug: "" },
  { label: "Students", icon: GraduationCap, slug: "/students", roles: ["ADMIN", "TEACHER"] },
  { label: "Class Teachers", icon: Users, slug: "/assign-class-teachers", roles: ["ADMIN"] },
  { label: "Class Teacher", icon: Users, slug: "/class-teacher", roles: ["TEACHER", "STUDENT"] },
  // Student: personal attendance
  { label: "Attendance", icon: CalendarCheck, slug: "/attendance", roles: ["STUDENT"] },
  // Teacher: personal + class attendance
  { label: "My Attendance", icon: CalendarCheck, slug: "/attendance", roles: ["TEACHER"] },
  { label: "Class Attendance", icon: ClipboardList, slug: "/class-attendance", roles: ["TEACHER"] },
  // Admin: student overview + teacher marking + teacher overview
  { label: "Student Attendance", icon: CalendarCheck, slug: "/attendance", roles: ["ADMIN"] },
  { label: "Teacher Attendance", icon: ClipboardList, slug: "/teacher-attendance", roles: ["ADMIN"] },
  { label: "Teacher Overview", icon: Users, slug: "/teacher-attendance-overview", roles: ["ADMIN"] },
  { label: "Calendar", icon: CalendarDays, slug: "/calendar" },
  { label: "Birthdays", icon: Cake, slug: "/birthdays" },
  { label: "Class Log", icon: BookOpen, slug: "/class-log" },
  { label: "Profile", icon: UserRound, slug: "/profile" },
]

interface SidebarNavProps {
  basePath: string
  role?: string
}

export function SidebarNav({ basePath, role }: SidebarNavProps) {
  const pathname = usePathname()

  const items = NAV_ITEMS.filter(
    (item) => !("roles" in item) || item.roles?.includes(role ?? "")
  )

  return (
    <SidebarMenu>
      {items.map(({ label, icon: Icon, slug }) => {
        const href = `${basePath}${slug}`
        const isActive = slug === "" ? pathname === basePath : pathname.startsWith(href)

        return (
          <SidebarMenuItem key={label}>
            <SidebarMenuButton
              asChild
              tooltip={label}
              className={cn(
                "h-9 gap-2.5 rounded-lg text-[13.5px]",
                isActive
                  ? "bg-slate-100 text-slate-900 font-medium hover:bg-slate-100 hover:text-slate-900"
                  : "text-slate-500 font-normal hover:bg-slate-50 hover:text-slate-700"
              )}
            >
              <Link href={href}>
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}
