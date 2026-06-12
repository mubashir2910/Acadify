"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getDashboardPath } from "@/lib/auth-redirect"

// Roles that have a notifications inbox (SUPER_ADMIN has no notifications feature).
const ROLES_WITH_NOTIFICATIONS = ["STUDENT", "TEACHER", "ADMIN"]

/**
 * Notification bell for dashboard headers. Self-contained: resolves its own link
 * from the session role, fetches the unread count, and stays in sync with the
 * sidebar badge via the shared `notifications:marked-read` window event.
 */
export function NotificationBell() {
  const { data: session } = useSession()
  const role = session?.user?.role ?? ""
  const [count, setCount] = useState(0)

  const enabled = ROLES_WITH_NOTIFICATIONS.includes(role)

  // Fetch unread count on mount (refreshes on full page navigation)
  useEffect(() => {
    if (!enabled) return
    fetch("/api/notifications/unread-count")
      .then((r) => r.json())
      .then((data) => setCount(data?.count ?? 0))
      .catch(() => {/* badge is non-critical */})
  }, [enabled])

  // Decrement in real time when a notification is marked read (same event the
  // sidebar badge uses, so both stay in sync).
  useEffect(() => {
    function onRead() {
      setCount((prev) => Math.max(0, prev - 1))
    }
    window.addEventListener("notifications:marked-read", onRead)
    return () => window.removeEventListener("notifications:marked-read", onRead)
  }, [])

  if (!enabled) return null

  const href = `${getDashboardPath(role)}/notifications`

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      className="relative shrink-0"
    >
      <Link
        href={href}
        aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    </Button>
  )
}
