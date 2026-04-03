"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { LayoutDashboard, CalendarCheck, CalendarDays, Users, GraduationCap, Cake, ClipboardList, Bell, TableProperties, Compass, FolderCog, BarChart3, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar"

interface NavItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  slug: string
  roles?: string[]
}

interface NavSection {
  heading?: string
  headingIcon?: string
  items: NavItem[]
}

// ─── Admin sidebar layout ────────────────────────────────────────────
const ADMIN_SECTIONS: NavSection[] = [
  {
    heading: "Dashboard",
    headingIcon: "🧭",
    items: [
      { label: "Overview", icon: LayoutDashboard, slug: "" },
    ],
  },
  {
    heading: "People & Structure",
    headingIcon: "👥",
    items: [
      { label: "Students", icon: GraduationCap, slug: "/students" },
      { label: "Class Management", icon: Users, slug: "/assign-class-teachers" },
    ],
  },
  {
    heading: "Operations",
    headingIcon: "🛠",
    items: [
      { label: "Staff Attendance", icon: ClipboardList, slug: "/teacher-attendance" },
    ],
  },
  {
    heading: "Insights",
    headingIcon: "📊",
    items: [
      { label: "Staff Insights", icon: Users, slug: "/teacher-attendance-overview" },
      { label: "Student Insights", icon: CalendarCheck, slug: "/attendance" },
    ],
  },
  {
    heading: "Utilities",
    headingIcon: "⚙",
    items: [
      { label: "Notifications", icon: Bell, slug: "/notifications" },
      { label: "Timetable", icon: TableProperties, slug: "/timetable" },
      { label: "Calendar", icon: CalendarDays, slug: "/calendar" },
      { label: "Birthdays", icon: Cake, slug: "/birthdays" },
    ],
  },
]

// ─── Teacher sidebar layout ──────────────────────────────────────────
const TEACHER_SECTIONS: NavSection[] = [
  {
    heading: "Dashboard",
    headingIcon: "🧭",
    items: [
      { label: "Overview", icon: LayoutDashboard, slug: "" },
    ],
  },
  {
    heading: "People & Structure",
    headingIcon: "👥",
    items: [
      { label: "Students", icon: GraduationCap, slug: "/students" },
      { label: "Class Management", icon: Users, slug: "/class-teacher" },
    ],
  },
  {
    heading: "Operations",
    headingIcon: "🛠",
    items: [
      { label: "Student Attendance", icon: ClipboardList, slug: "/class-attendance" },
    ],
  },
  {
    heading: "Insights",
    headingIcon: "📊",
    items: [
      { label: "My Attendance", icon: CalendarCheck, slug: "/attendance" },
    ],
  },
  {
    heading: "Utilities",
    headingIcon: "⚙",
    items: [
      { label: "Notifications", icon: Bell, slug: "/notifications" },
      { label: "Timetable", icon: TableProperties, slug: "/timetable" },
      { label: "Calendar", icon: CalendarDays, slug: "/calendar" },
      { label: "Birthdays", icon: Cake, slug: "/birthdays" },
    ],
  },
]

// ─── Student sidebar layout ─────────────────────────────────────────
const STUDENT_SECTIONS: NavSection[] = [
  {
    heading: "Dashboard",
    headingIcon: "🧭",
    items: [
      { label: "Overview", icon: LayoutDashboard, slug: "" },
    ],
  },
  {
    heading: "People & Structure",
    headingIcon: "👥",
    items: [
      { label: "Class Management", icon: Users, slug: "/class-teacher" },
    ],
  },
  {
    heading: "Insights",
    headingIcon: "📊",
    items: [
      { label: "My Attendance", icon: CalendarCheck, slug: "/attendance" },
    ],
  },
  {
    heading: "Utilities",
    headingIcon: "⚙",
    items: [
      { label: "Notifications", icon: Bell, slug: "/notifications" },
      { label: "Timetable", icon: TableProperties, slug: "/timetable" },
      { label: "Calendar", icon: CalendarDays, slug: "/calendar" },
      { label: "Birthdays", icon: Cake, slug: "/birthdays" },
    ],
  },
]

function getSections(role?: string): NavSection[] {
  if (role === "ADMIN") return ADMIN_SECTIONS
  if (role === "TEACHER") return TEACHER_SECTIONS
  if (role === "STUDENT") return STUDENT_SECTIONS
  return []
}

interface SidebarNavProps {
  basePath: string
  role?: string
}

export function SidebarNav({ basePath, role }: SidebarNavProps) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch unread count on mount (updates on full page navigation)
  useEffect(() => {
    if (!role || role === "SUPER_ADMIN") return
    fetch("/api/notifications/unread-count")
      .then((r) => r.json())
      .then((data) => setUnreadCount(data?.count ?? 0))
      .catch(() => {/* badge is non-critical */})
  }, [role])

  // Decrement badge in real time when a notification is marked as read
  useEffect(() => {
    function onRead() {
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
    window.addEventListener("notifications:marked-read", onRead)
    return () => window.removeEventListener("notifications:marked-read", onRead)
  }, [])

  const sections = getSections(role)

  return (
    <div className="mt-2 flex flex-col">
      {sections.map((section, sIdx) => (
        <div key={sIdx} className={cn(sIdx > 0 && "mt-4")}>
          {section.heading && (
            <div className="flex items-center gap-1.5 px-2 mb-1.5">
              {section.headingIcon && (
                <span className="text-xs leading-none">{section.headingIcon}</span>
              )}
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 group-data-[collapsible=icon]:hidden">
                {section.heading}
              </span>
            </div>
          )}
          <SidebarMenu>
            {section.items.map(({ label, icon: Icon, slug }) => {
              const href = `${basePath}${slug}`
              const isActive = slug === "" ? pathname === basePath : pathname === href || pathname.startsWith(href + "/")

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
                    <Link href={href} onClick={() => setOpenMobile(false)}>
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{label}</span>
                      {label === "Notifications" && unreadCount > 0 && (
                        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </div>
      ))}
    </div>
  )
}

