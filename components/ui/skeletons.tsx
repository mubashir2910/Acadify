import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface TableSkeletonProps {
  rows?: number
  columns?: number
  className?: string
  showHeader?: boolean
}

export function TableSkeleton({
  rows = 6,
  columns = 4,
  className,
  showHeader = true,
}: TableSkeletonProps) {
  return (
    <div className={cn("w-full space-y-2.5", className)}>
      {showHeader && (
        <div
          className="grid gap-3 px-3 py-2"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-3/4" />
          ))}
        </div>
      )}
      <div className="space-y-1.5">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="grid gap-3 rounded-md border border-border px-3 py-3"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, colIdx) => (
              <Skeleton
                key={colIdx}
                className={cn(
                  "h-4",
                  colIdx === 0 ? "w-5/6" : colIdx === columns - 1 ? "w-1/2" : "w-2/3"
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

interface CardSkeletonProps {
  className?: string
  lines?: number
}

export function CardSkeleton({ className, lines = 3 }: CardSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 space-y-3",
        className
      )}
    >
      <Skeleton className="h-4 w-1/3" />
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn("h-3", i === lines - 1 ? "w-3/5" : "w-full")}
          />
        ))}
      </div>
    </div>
  )
}

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 space-y-3",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}

export function FormFieldSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-9 w-full" />
    </div>
  )
}

interface ListSkeletonProps {
  items?: number
  className?: string
  withAvatar?: boolean
}

export function ListSkeleton({
  items = 5,
  className,
  withAvatar = true,
}: ListSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5"
        >
          {withAvatar && <Skeleton className="h-8 w-8 rounded-full" />}
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  )
}

interface PageHeaderSkeletonProps {
  className?: string
}

export function PageHeaderSkeleton({ className }: PageHeaderSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-3 w-72" />
    </div>
  )
}

export function DashboardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6 p-4 sm:p-6", className)}>
      <PageHeaderSkeleton />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <CardSkeleton lines={5} />
        <CardSkeleton lines={5} />
      </div>
    </div>
  )
}
