"use client"

import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { motion } from "motion/react"
import { LayoutDashboard, CalendarCheck, CalendarDays, Users, GraduationCap, Cake, ClipboardList, Bell, TableProperties, Compass, FolderCog, BarChart3, Settings, CreditCard, Wallet, ShieldCheck, Loader2, Swords, Trophy, PlusCircle, CalendarClock, ListChecks, BookOpen, ClipboardCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar"
import { NavLink } from "@/components/layout/nav-link"

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
      { label: "Track Logs", icon: ClipboardCheck, slug: "/track-logs" },
    ],
  },
  {
    heading: "Arena",
    headingIcon: "🎮",
    items: [
      { label: "Manage Arena", icon: Trophy, slug: "/arena" },
      { label: "My Contests", icon: ListChecks, slug: "/quiz" },
      { label: "Create Arena", icon: PlusCircle, slug: "/arena/create" },
      { label: "Upcoming Contests", icon: CalendarClock, slug: "/arena/upcoming" },
    ],
  },
  {
    heading: "Financials",
    headingIcon: "💳",
    items: [
      { label: "Fees", icon: CreditCard, slug: "/fees" },
      { label: "Pending Verifications", icon: ShieldCheck, slug: "/fees/pending" },
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
      { label: "Class Log", icon: BookOpen, slug: "/class-log" },
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
    heading: "Arena",
    headingIcon: "🎮",
    items: [
      { label: "Manage Arena", icon: Trophy, slug: "/arena" },
      { label: "My Contests", icon: ListChecks, slug: "/quiz" },
      { label: "Create Arena", icon: PlusCircle, slug: "/arena/create" },
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
      { label: "Class Log", icon: BookOpen, slug: "/class-log" },
    ],
  },
  {
    heading: "Arena",
    headingIcon: "🎮",
    items: [
      { label: "Acadify Arena", icon: Swords, slug: "/arena" },
    ],
  },
  {
    heading: "Financials",
    headingIcon: "💳",
    items: [
      { label: "My Fees", icon: Wallet, slug: "/fees" },
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
  // Admin-as-class-teacher detection. Determined by assignment data (not role),
  // so admins with no teaching duties see the original admin sidebar unchanged.
  const [isAdminClassTeacher, setIsAdminClassTeacher] = useState(false)

  // Fetch unread count on mount (updates on full page navigation)
  useEffect(() => {
    if (!role || role === "SUPER_ADMIN") return
    fetch("/api/notifications/unread-count")
      .then((r) => r.json())
      .then((data) => setUnreadCount(data?.count ?? 0))
      .catch(() => {/* badge is non-critical */})
  }, [role])

  // Fetch teaching context only for admins
  useEffect(() => {
    if (role !== "ADMIN") return
    fetch("/api/admin/teaching-context")
      .then((r) => (r.ok ? r.json() : null))
      .then((ctx) => setIsAdminClassTeacher(Boolean(ctx?.isClassTeacher)))
      .catch(() => {/* non-critical */})
  }, [role])

  // Decrement badge in real time when a notification is marked as read
  useEffect(() => {
    function onRead() {
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
    window.addEventListener("notifications:marked-read", onRead)
    return () => window.removeEventListener("notifications:marked-read", onRead)
  }, [])

  // Conditional injection of teaching items ("Student Attendance" + personal
  // "Class Log") into the admin's Operations section, only when assignment data
  // shows they're a class teacher.
  const sections = useMemo(() => {
    const base = getSections(role)
    if (role !== "ADMIN" || !isAdminClassTeacher) return base
    return base.map((section) => {
      if (section.heading !== "Operations") return section
      const injected: NavItem[] = [
        { label: "Student Attendance", icon: ClipboardList, slug: "/student-attendance" },
        { label: "Class Log", icon: BookOpen, slug: "/class-log" },
      ]
      // Don't double-add anything already present
      const existing = new Set(section.items.map((i) => i.slug))
      const toAdd = injected.filter((i) => !existing.has(i.slug))
      return { ...section, items: [...toAdd, ...section.items] }
    })
  }, [role, isAdminClassTeacher])

  return (
    <div className="mt-2 flex flex-col">
      {sections.map((section, sIdx) => (
        <div key={sIdx} className={cn(sIdx > 0 && "mt-4")}>
          {section.heading && (
            <div className="flex items-center gap-1.5 px-2 mb-1.5">
              {section.headingIcon && (
                <span className="text-xs leading-none">{section.headingIcon}</span>
              )}
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground group-data-[collapsible=icon]:hidden">
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
                        ? "bg-accent text-foreground font-medium hover:bg-accent hover:text-foreground"
                        : "text-muted-foreground font-normal hover:bg-accent/50 hover:text-foreground"
                    )}
                  >
                    <NavLink href={href} onNavigate={() => setOpenMobile(false)}>
                      {({ pending }) => (
                        <span
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-md transition-[background,opacity,transform] duration-150 active:scale-[0.98]",
                            pending && !isActive && "bg-accent/50",
                            pending && "opacity-70"
                          )}
                        >
                          {pending ? (
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                          ) : (
                            <Icon className="h-4 w-4 shrink-0" />
                          )}
                          <span className="flex-1">{label}</span>
                          {label === "Notifications" && unreadCount > 0 && (
                            // key={unreadCount} remounts the badge whenever the
                            // count changes, firing a one-shot scale pop so a new
                            // notification draws the eye (state-indication motion).
                            <motion.span
                              key={unreadCount}
                              initial={{ scale: 0.6 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 500, damping: 18 }}
                              className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white"
                            >
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </motion.span>
                          )}
                        </span>
                      )}
                    </NavLink>
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

