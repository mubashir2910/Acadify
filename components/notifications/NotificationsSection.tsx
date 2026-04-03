"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Bell, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { NotificationItem, NotificationListResponse } from "@/schemas/notifications.schema"
import { NotificationCard } from "./NotificationCard"
import { NotificationDetailModal } from "./NotificationDetailModal"
import { CreateNotificationModal } from "./CreateNotificationModal"

export function NotificationsSection() {
  const { data: session } = useSession()
  const role = session?.user?.role ?? ""
  const userId = session?.user?.id ?? ""

  const [tab, setTab] = useState<"inbox" | "mine">("inbox")
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [fetchError, setFetchError] = useState(false)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? (notifications.find((n) => n.id === selectedId) ?? null) : null
  const [detailOpen, setDetailOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const LIMIT = 20
  const canCreate = role === "ADMIN" || role === "TEACHER"

  const fetchNotifications = useCallback(async (pageNum: number, replace: boolean, mine: boolean) => {
    try {
      const url = `/api/notifications?page=${pageNum}&limit=${LIMIT}${mine ? "&mine=true" : ""}`
      const res = await fetch(url)
      if (!res.ok) throw new Error()
      const data: NotificationListResponse = await res.json()
      setNotifications((prev) =>
        replace ? data.notifications : [...prev, ...data.notifications]
      )
      setTotal(data.total)
      setFetchError(false)
    } catch {
      setFetchError(true)
    }
  }, [])

  // Refetch whenever the tab changes (also covers the initial mount)
  useEffect(() => {
    setLoading(true)
    setFetchError(false)
    setPage(1)
    setSelectedId(null)
    fetchNotifications(1, true, tab === "mine").finally(() => setLoading(false))
  }, [fetchNotifications, tab])

  async function handleLoadMore() {
    const nextPage = page + 1
    setLoadingMore(true)
    await fetchNotifications(nextPage, false, tab === "mine")
    setPage(nextPage)
    setLoadingMore(false)
  }

  function handleCardClick(notification: NotificationItem) {
    setSelectedId(notification.id)
    setDetailOpen(true)

    // Mark as read — fire and forget, optimistic update
    if (!notification.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      )
      window.dispatchEvent(new CustomEvent("notifications:marked-read"))
      fetch(`/api/notifications/${notification.id}/read`, { method: "PATCH" }).catch(
        () => {/* non-critical */}
      )
    }
  }

  function handleDeleted(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    setTotal((prev) => Math.max(0, prev - 1))
  }

  function handleCreated() {
    // Always navigate to "Created by Me" — the inbox intentionally excludes own
    // notifications. The tab-change useEffect refetches the "mine" list, so the
    // new notification will appear at the top without any optimistic prepend.
    setTab("mine")
  }

  // In "mine" tab every item was created by the current user, so delete is always allowed.
  const canDelete =
    selected !== null &&
    (role === "ADMIN" || role === "TEACHER") &&
    (tab === "mine" || selected.created_by_id === userId)

  const hasMore = notifications.length < total

  // ─── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        {canCreate && <TabBar tab={tab} onTabChange={setTab} onNew={() => setCreateOpen(true)} />}
        <div className="space-y-3 mt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
        <CreateNotificationModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={handleCreated}
        />
      </>
    )
  }

  // ─── Error state ───────────────────────────────────────────────────────────
  if (fetchError) {
    return (
      <>
        {canCreate && <TabBar tab={tab} onTabChange={setTab} onNew={() => setCreateOpen(true)} />}
        <div className="flex flex-col items-center gap-3 py-16 text-slate-500 mt-4">
          <p className="text-sm">Failed to load notifications.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFetchError(false)
              setLoading(true)
              fetchNotifications(1, true, tab === "mine").finally(() => setLoading(false))
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <CreateNotificationModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={handleCreated}
        />
      </>
    )
  }

  return (
    <>
      {/* Header — tabs for creators, simple count for students */}
      {canCreate ? (
        <TabBar tab={tab} onTabChange={setTab} onNew={() => setCreateOpen(true)} />
      ) : (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">
            {total > 0 ? `${total} notification${total !== 1 ? "s" : ""}` : ""}
          </p>
        </div>
      )}

      {/* Empty state */}
      {notifications.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-slate-400">
          <Bell className="h-10 w-10 opacity-30" />
          <p className="text-sm">
            {tab === "mine"
              ? "You haven't created any notifications yet"
              : "No notifications yet"}
          </p>
        </div>
      )}

      {/* Notification list */}
      <div className="space-y-2">
        {notifications.map((n) => (
          <NotificationCard key={n.id} notification={n} onClick={() => handleCardClick(n)} />
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}

      {/* Detail modal */}
      <NotificationDetailModal
        notification={selected}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        canDelete={canDelete}
        onDeleted={handleDeleted}
      />

      {/* Create modal */}
      <CreateNotificationModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </>
  )
}

// ─── Tab bar (only shown to ADMIN / TEACHER) ──────────────────────────────────

interface TabBarProps {
  tab: "inbox" | "mine"
  onTabChange: (t: "inbox" | "mine") => void
  onNew: () => void
}

function TabBar({ tab, onTabChange, onNew }: TabBarProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex gap-1">
        <button
          onClick={() => onTabChange("inbox")}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            tab === "inbox"
              ? "bg-slate-100 text-slate-900"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          )}
        >
          Inbox
        </button>
        <button
          onClick={() => onTabChange("mine")}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            tab === "mine"
              ? "bg-slate-100 text-slate-900"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          )}
        >
          Created by Me
        </button>
      </div>
      <Button size="sm" onClick={onNew}>
        + New Notification
      </Button>
    </div>
  )
}
