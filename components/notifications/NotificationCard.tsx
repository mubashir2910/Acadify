import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { NotificationItem } from "@/schemas/notifications.schema"
import { formatDistanceToNow } from "date-fns"
import { audienceLabel } from "./utils"

interface NotificationCardProps {
  notification: NotificationItem
  onClick: () => void
}

export function NotificationCard({ notification, onClick }: NotificationCardProps) {
  const relativeTime = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
  })

  return (
    <Card
      onClick={onClick}
      className={`cursor-pointer transition-colors hover:bg-slate-50 ${
        !notification.is_read ? "border-l-4 border-l-blue-500" : ""
      }`}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              className={`text-sm leading-snug ${
                !notification.is_read ? "font-semibold text-slate-900" : "font-medium text-slate-700"
              }`}
            >
              {notification.title}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
              {notification.message}
            </p>
          </div>
          {!notification.is_read && (
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
          )}
        </div>

        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {audienceLabel(
              notification.target_audience,
              notification.target_class,
              notification.target_section
            )}
          </Badge>
          <span className="text-[11px] text-slate-400">
            {notification.created_by_name ?? "Deleted User"} · {relativeTime}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
